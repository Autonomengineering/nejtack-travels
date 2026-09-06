const GOALS_KEY = "grabbresan-goals-v1";
const LIKES_KEY = "grabbresan-likes-v1";
const DB_NAME = "grabbresan-local-media";
const DB_VERSION = 1;
const TOILET_STORE = "toilets";
const PRAYER_TIMER_KEY = "grabbresan-prayer-deadline-v1";
const PRAYER_CYCLE_MS = 4 * 60 * 60 * 1000;

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

let adTimer;
let lastAdIndex = -1;
let prayerDeadline = loadPrayerDeadline();

const defaultGoals = [
  "Alla ska hinna med flyget",
  "Beställ något utan att veta vad det är",
  "Ta ett gruppfoto före midnatt",
];

const state = {
  goals: readJson(GOALS_KEY, defaultGoals.map((text, index) => ({ id: Date.now() + index, text, done: false }))),
  toilets: [],
  liked: new Set(readJson(LIKES_KEY, [])),
};

const storageAdapter = {
  // Byt ut dessa tre metoder mot anrop till t.ex. Supabase när appen ska få delad lagring.
  async listToilets() {
    const db = await openDatabase();
    return requestToPromise(db.transaction(TOILET_STORE, "readonly").objectStore(TOILET_STORE).getAll());
  },
  async addToilet(toilet) {
    const db = await openDatabase();
    await requestToPromise(db.transaction(TOILET_STORE, "readwrite").objectStore(TOILET_STORE).add(toilet));
    return toilet;
  },
  async updateToilet(toilet) {
    const db = await openDatabase();
    await requestToPromise(db.transaction(TOILET_STORE, "readwrite").objectStore(TOILET_STORE).put(toilet));
    return toilet;
  },
};

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveGoals() {
  localStorage.setItem(GOALS_KEY, JSON.stringify(state.goals));
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

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TOILET_STORE)) db.createObjectStore(TOILET_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

    checkbox.addEventListener("change", () => {
      goal.done = checkbox.checked;
      saveGoals();
      renderGoals();
    });
    remove.addEventListener("click", () => {
      state.goals = state.goals.filter((entry) => entry.id !== goal.id);
      saveGoals();
      renderGoals();
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
    img.src = URL.createObjectURL(toilet.photo);
    img.alt = `Toalett på ${toilet.place}`;
    img.addEventListener("load", () => URL.revokeObjectURL(img.src), { once: true });
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
      toilet.likes = Math.max(0, toilet.likes + (isLiked ? -1 : 1));
      isLiked ? state.liked.delete(toilet.id) : state.liked.add(toilet.id);
      localStorage.setItem(LIKES_KEY, JSON.stringify([...state.liked]));
      await storageAdapter.updateToilet(toilet);
      renderToilets();
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

document.querySelector("#goal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#goal-input");
  const text = input.value.trim();
  if (!text) return;
  state.goals.push({ id: Date.now(), text, done: false });
  input.value = "";
  saveGoals();
  renderGoals();
});

document.querySelector("#clear-completed").addEventListener("click", () => {
  state.goals = state.goals.filter((goal) => !goal.done);
  saveGoals();
  renderGoals();
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
  if (!photo || !place) return;
  const toilet = { id: crypto.randomUUID(), place, photo, rating, likes: 0, createdAt: Date.now() };
  await storageAdapter.addToilet(toilet);
  state.toilets.push(toilet);
  closeUpload();
  renderToilets();
});

window.addEventListener("hashchange", route);
route();
renderGoals();
updateRatingPreview();
updatePrayerTimer();
window.setInterval(updatePrayerTimer, 250);
storageAdapter.listToilets().then((toilets) => {
  state.toilets = toilets;
  renderToilets();
}).catch(() => {
  document.querySelector("#toilet-empty p").textContent = "LOKAL BILDLAGRING STÖDS INTE HÄR.";
  document.querySelector("#toilet-empty").hidden = false;
});
