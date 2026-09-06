const LIKES_KEY = "grabbresan-likes-v1";
const PRAYER_TIMER_KEY = "grabbresan-prayer-deadline-v1";
const PRAYER_CYCLE_MS = 4 * 60 * 60 * 1000;
const PHOTO_BUCKET = "toilet-photos";

const advertisers = [
  {
    logo: "assets/logo-evermind.png",
    logoAlt: "Evermind Design Co.",
    category: "ETT BETALT SAMARBETE MED",
    title: "EVERMIND DESIGN",
    copy: "Flyttar pixlar och kapar bräder.",
    offer: "SÖKES: REVISOR MED ERFARENHET AV EKOBROTT",
    theme: "provisions",
  },
  {
    logo: "assets/logo-lidens.png",
    logoAlt: "Lidéns Ingenjörsbyrå",
    category: "ETT BETALT SAMARBETE MED",
    title: "LIDÉNS INGENJÖRSBYRÅ AB.",
    copy: "Förmedlar lös och fast egendom i en krigszon nära dig.",
    offer: "20% PÅ LANDMINOR",
    theme: "transport",
  },
  {
    logo: "assets/logo-ostlund.png",
    logoAlt: "Östlund Innovation",
    category: "ETT BETALT SAMARBETE MED",
    title: "ÖSTLUND INNOVATION AB.",
    copy: "”Ingenjörstjänster? …nääe jag day-tradar.”",
    offer: "1000% avkastning på dina brackets",
    theme: "health",
  },
  {
    logo: "assets/logo-jp-innovation.png",
    logoAlt: "JP Innovation",
    category: "ETT BETALT SAMARBETE MED",
    title: "JONAS PERSSON INNOVATION AB.",
    copy: "”För mig börjar innovation vid fjärde ölen.”",
    offer: "ÖPPET 10–11, JÄMNA VECKOR, SKICKA DM FÖR SJUKT OKRÅNGLIG VÄGBESKRIVNING",
    theme: "currency",
  },
];

const config = window.NEJTACK_CONFIG || {};
const supabaseClient = window.supabase?.createClient(config.supabaseUrl, config.supabasePublishableKey);

let adTimer;
let lastAdIndex = -1;
let prayerDeadline = loadPrayerDeadline();

const state = {
  goals: [],
  toilets: [],
  liked: new Set(readJson(LIKES_KEY, [])),
};

const storageAdapter = {
  async listGoals() {
    const { data, error } = await supabaseClient
      .from("goals")
      .select("id,text,done,position,created_at")
      .order("position", { ascending: true });
    if (error) throw error;
    return data;
  },

  async addGoal(text) {
    const lastPosition = state.goals.reduce((highest, goal) => Math.max(highest, Number(goal.position) || 0), 0);
    const { error } = await supabaseClient.from("goals").insert({ text, position: lastPosition + 1 });
    if (error) throw error;
  },

  async updateGoal(id, done) {
    const { error } = await supabaseClient.from("goals").update({ done }).eq("id", id);
    if (error) throw error;
  },

  async deleteGoal(id) {
    const { error } = await supabaseClient.from("goals").delete().eq("id", id);
    if (error) throw error;
  },

  async deleteCompletedGoals() {
    const { error } = await supabaseClient.from("goals").delete().eq("done", true);
    if (error) throw error;
  },

  async listToilets() {
    const { data, error } = await supabaseClient
      .from("toilets")
      .select("id,place,photo_path,rating,likes,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(mapToilet);
  },

  async addToilet({ place, photo, rating }) {
    const extension = (photo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const photoPath = `${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseClient.storage
      .from(PHOTO_BUCKET)
      .upload(photoPath, photo, { contentType: photo.type || "image/jpeg", upsert: false });
    if (uploadError) throw uploadError;

    const { error: insertError } = await supabaseClient.from("toilets").insert({
      place,
      photo_path: photoPath,
      rating,
      likes: 0,
    });

    if (insertError) {
      await supabaseClient.storage.from(PHOTO_BUCKET).remove([photoPath]);
      throw insertError;
    }
  },

  async updateLikes(id, likes) {
    const { error } = await supabaseClient.from("toilets").update({ likes }).eq("id", id);
    if (error) throw error;
  },
};

function mapToilet(row) {
  const { data } = supabaseClient.storage.from(PHOTO_BUCKET).getPublicUrl(row.photo_path);
  return {
    id: row.id,
    place: row.place,
    photoUrl: data.publicUrl,
    rating: Number(row.rating),
    likes: Number(row.likes),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function savePrayerDeadline() {
  try {
    localStorage.setItem(PRAYER_TIMER_KEY, String(prayerDeadline));
  } catch {
    // Timern fortsätter under besöket även om lokal lagring är avstängd.
  }
}

function loadPrayerDeadline() {
  const now = Date.now();
  let deadline;
  try {
    deadline = Number(localStorage.getItem(PRAYER_TIMER_KEY));
  } catch {
    deadline = 0;
  }
  if (!Number.isFinite(deadline) || deadline <= 0) deadline = now + PRAYER_CYCLE_MS;
  if (deadline < now - 999) {
    deadline += (Math.floor((now - deadline) / PRAYER_CYCLE_MS) + 1) * PRAYER_CYCLE_MS;
  }
  try {
    localStorage.setItem(PRAYER_TIMER_KEY, String(deadline));
  } catch {
    // Lokal lagring är valfri.
  }
  return deadline;
}

function updatePrayerTimer() {
  const timer = document.querySelector("#prayer-timer");
  let remaining = prayerDeadline - Date.now();
  if (remaining < -999) {
    prayerDeadline += (Math.floor(-remaining / PRAYER_CYCLE_MS) + 1) * PRAYER_CYCLE_MS;
    savePrayerDeadline();
    remaining = prayerDeadline - Date.now();
  }
  const totalSeconds = Math.max(0, Math.ceil(remaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  timer.textContent = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  timer.dateTime = `PT${hours}H${minutes}M${seconds}S`;
}

function route() {
  const requested = location.hash.replace("#", "") || "mal";
  const active = ["mal", "bonpallen", "shitadvisor"].includes(requested) ? requested : "mal";
  document.querySelectorAll("[data-page]").forEach((page) => {
    const selected = page.dataset.page === active;
    page.hidden = !selected;
    page.classList.toggle("is-active", selected);
  });
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const selected = link.dataset.nav === active;
    link.classList.toggle("is-active", selected);
    selected ? link.setAttribute("aria-current", "page") : link.removeAttribute("aria-current");
  });
  clearTimeout(adTimer);
  if (active === "mal") {
    adTimer = window.setTimeout(showRandomAd, 1400);
  } else if (adDialog.open) {
    adDialog.close();
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderGoals() {
  const list = document.querySelector("#goal-list");
  const template = document.querySelector("#goal-template");
  list.replaceChildren();

  state.goals.forEach((goal) => {
    const node = template.content.cloneNode(true);
    const item = node.querySelector("li");
    const checkbox = node.querySelector("input");
    const text = node.querySelector(".goal-text");
    const remove = node.querySelector(".delete-goal");
    checkbox.checked = goal.done;
    text.textContent = goal.text;
    item.classList.toggle("is-done", goal.done);

    checkbox.addEventListener("change", async () => {
      checkbox.disabled = true;
      try {
        await storageAdapter.updateGoal(goal.id, checkbox.checked);
        await loadGoals();
      } catch (error) {
        checkbox.checked = goal.done;
        reportConnectionError("Målets status kunde inte sparas.", error);
      }
    });
    remove.addEventListener("click", async () => {
      remove.disabled = true;
      try {
        await storageAdapter.deleteGoal(goal.id);
        await loadGoals();
      } catch (error) {
        remove.disabled = false;
        reportConnectionError("Målet kunde inte tas bort.", error);
      }
    });
    list.append(node);
  });

  const completed = state.goals.filter((goal) => goal.done).length;
  document.querySelector("#goal-count").textContent = `${completed} AV ${state.goals.length} AVKLARADE`;
  document.querySelector("#clear-completed").disabled = completed === 0;
}

function renderToilets() {
  const grid = document.querySelector("#toilet-grid");
  const empty = document.querySelector("#toilet-empty");
  const template = document.querySelector("#toilet-template");
  grid.replaceChildren();
  const sorted = [...state.toilets].sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt);
  empty.hidden = sorted.length !== 0;

  sorted.forEach((toilet, index) => {
    const node = template.content.cloneNode(true);
    const img = node.querySelector("img");
    const likeButton = node.querySelector(".like-button");
    img.src = toilet.photoUrl;
    img.alt = `Toalett på ${toilet.place}`;
    node.querySelector(".rank-badge").textContent = `#${index + 1}`;
    node.querySelector(".place-name").textContent = toilet.place;
    node.querySelector(".review-date").textContent = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(toilet.createdAt);
    const personalRating = node.querySelector(".personal-rating");
    if (Number.isFinite(toilet.rating)) {
      const rating = Math.min(5, Math.max(0, Math.round(toilet.rating * 2) / 2));
      personalRating.hidden = false;
      personalRating.querySelector(".rating-stars").style.setProperty("--fill", `${rating * 20}%`);
      personalRating.querySelector(".rating-number").textContent = `${formatRating(rating)} / 5`;
      personalRating.setAttribute("aria-label", `Personligt betyg ${formatRating(rating)} av 5`);
    }
    node.querySelector(".like-count").textContent = toilet.likes;
    likeButton.classList.toggle("is-liked", state.liked.has(toilet.id));
    likeButton.setAttribute("aria-label", `${state.liked.has(toilet.id) ? "Ta bort gilla-markering från" : "Gilla"} ${toilet.place}`);
    likeButton.addEventListener("click", async () => {
      const isLiked = state.liked.has(toilet.id);
      const nextLikes = Math.max(0, toilet.likes + (isLiked ? -1 : 1));
      likeButton.disabled = true;
      try {
        await storageAdapter.updateLikes(toilet.id, nextLikes);
        isLiked ? state.liked.delete(toilet.id) : state.liked.add(toilet.id);
        localStorage.setItem(LIKES_KEY, JSON.stringify([...state.liked]));
        await loadToilets();
      } catch (error) {
        likeButton.disabled = false;
        reportConnectionError("Rösten kunde inte sparas.", error);
      }
    });
    grid.append(node);
  });
}

const uploadDialog = document.querySelector("#upload-dialog");
const uploadForm = document.querySelector("#upload-form");
const photoInput = document.querySelector("#toilet-photo");
const ratingInput = document.querySelector("#toilet-rating");
const adDialog = document.querySelector("#ad-dialog");

function formatRating(rating) {
  return rating.toFixed(1).replace(".", ",").replace(",0", "");
}

function updateRatingPreview() {
  const rating = ratingInput.valueAsNumber;
  document.querySelector("#rating-preview-stars").style.setProperty("--fill", `${rating * 20}%`);
  document.querySelector("#rating-value").textContent = `${formatRating(rating)} / 5`;
}

function showRandomAd() {
  if ((location.hash.replace("#", "") || "mal") !== "mal" || adDialog.open) return;
  const choices = advertisers.map((_, index) => index).filter((index) => index !== lastAdIndex);
  lastAdIndex = choices[Math.floor(Math.random() * choices.length)];
  const advertiser = advertisers[lastAdIndex];
  adDialog.dataset.theme = advertiser.theme;
  const adLogo = document.querySelector("#ad-logo");
  adLogo.src = advertiser.logo;
  adLogo.alt = advertiser.logoAlt;
  document.querySelector("#ad-category").textContent = advertiser.category;
  document.querySelector("#ad-title").textContent = advertiser.title;
  document.querySelector("#ad-copy").textContent = advertiser.copy;
  document.querySelector("#ad-offer").textContent = advertiser.offer;
  adDialog.showModal();
}

function openUpload() {
  uploadDialog.showModal();
}

function closeUpload() {
  uploadDialog.close();
  uploadForm.reset();
  document.querySelector("#file-label").textContent = "VÄLJ TOALETTBILD";
  updateRatingPreview();
}

function reportConnectionError(message, error) {
  console.error(message, error);
  window.alert(`${message} Kontrollera anslutningen och försök igen.`);
}

async function loadGoals() {
  state.goals = await storageAdapter.listGoals();
  renderGoals();
}

async function loadToilets() {
  state.toilets = await storageAdapter.listToilets();
  renderToilets();
}

document.querySelector("#goal-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#goal-input");
  const submit = event.currentTarget.querySelector("button[type='submit']");
  const text = input.value.trim();
  if (!text) return;
  submit.disabled = true;
  try {
    await storageAdapter.addGoal(text);
    input.value = "";
    await loadGoals();
  } catch (error) {
    reportConnectionError("Målet kunde inte läggas till.", error);
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("#clear-completed").addEventListener("click", async (event) => {
  event.currentTarget.disabled = true;
  try {
    await storageAdapter.deleteCompletedGoals();
    await loadGoals();
  } catch (error) {
    reportConnectionError("De avklarade målen kunde inte rensas.", error);
  }
});

document.querySelector("#close-ad").addEventListener("click", () => adDialog.close());
adDialog.addEventListener("cancel", (event) => event.preventDefault());

document.querySelector("#open-upload").addEventListener("click", openUpload);
document.querySelector("#empty-upload").addEventListener("click", openUpload);
document.querySelector("#close-upload").addEventListener("click", closeUpload);
document.querySelector("#cancel-upload").addEventListener("click", closeUpload);
uploadDialog.addEventListener("click", (event) => {
  if (event.target === uploadDialog) closeUpload();
});
photoInput.addEventListener("change", () => {
  document.querySelector("#file-label").textContent = photoInput.files?.[0]?.name || "VÄLJ TOALETTBILD";
});
ratingInput.addEventListener("input", updateRatingPreview);

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const photo = photoInput.files?.[0];
  const place = document.querySelector("#toilet-place").value.trim();
  const rating = ratingInput.valueAsNumber;
  const submit = uploadForm.querySelector("button[type='submit']");
  if (!photo || !place) return;
  submit.disabled = true;
  submit.textContent = "PUBLICERAR…";
  try {
    await storageAdapter.addToilet({ place, photo, rating });
    closeUpload();
    await loadToilets();
  } catch (error) {
    reportConnectionError("Recensionen kunde inte publiceras.", error);
  } finally {
    submit.disabled = false;
    submit.textContent = "PUBLICERA";
  }
});

function subscribeToChanges() {
  supabaseClient
    .channel("shared-trip-updates")
    .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, () => loadGoals().catch(console.error))
    .on("postgres_changes", { event: "*", schema: "public", table: "toilets" }, () => loadToilets().catch(console.error))
    .subscribe();
}

async function startSharedData() {
  if (!supabaseClient) {
    document.querySelector("#toilet-empty p").textContent = "DATABASANSLUTNING SAKNAS.";
    document.querySelector("#toilet-empty").hidden = false;
    return;
  }
  try {
    await Promise.all([loadGoals(), loadToilets()]);
    subscribeToChanges();
  } catch (error) {
    console.error(error);
    document.querySelector("#toilet-empty p").textContent = "KUNDE INTE ANSLUTA TILL RESEARKIVET.";
    document.querySelector("#toilet-empty").hidden = false;
  }
}

window.addEventListener("hashchange", route);
route();
renderGoals();
updateRatingPreview();
updatePrayerTimer();
window.setInterval(updatePrayerTimer, 250);
startSharedData();
