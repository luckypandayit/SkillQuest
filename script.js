
const videoInput = document.getElementById("videoInput");
const addVideoBtn = document.getElementById("addVideoBtn");
const playerContainer = document.getElementById("playerContainer");
const historyContainer = document.getElementById("historyContainer");
const searchInput = document.getElementById("searchInput");

let videoHistory = [];

try {
  const saved = JSON.parse(
    localStorage.getItem("youtubeVideoHistory") || "[]"
  );

  if (Array.isArray(saved)) {
    videoHistory = saved.filter(
      (video) =>
        video &&
        typeof video.id === "string" &&
        /^[a-zA-Z0-9_-]{11}$/.test(video.id)
    );
  }
} catch {
  videoHistory = [];
}

function getYouTubeVideoId(url) {
  try {
    const parsedUrl = new URL(url.trim());
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    let videoId = null;

    if (host === "youtu.be") {
      videoId = parsedUrl.pathname.split("/").filter(Boolean)[0];
    } else if (
      ["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)
    ) {
      if (parsedUrl.pathname === "/watch") {
        videoId = parsedUrl.searchParams.get("v");
      } else {
        const match = parsedUrl.pathname.match(
          /^\/(?:embed|shorts|live)\/([^/?]+)/
        );

        videoId = match ? match[1] : null;
      }
    }

    return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ? videoId
      : null;
  } catch {
    return null;
  }
}

function saveHistory() {
  try {
    localStorage.setItem(
      "youtubeVideoHistory",
      JSON.stringify(videoHistory)
    );
  } catch (error) {
    console.warn("Could not save video history:", error);
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char];
  });
}

function showMessage(message) {
  playerContainer.innerHTML = `
    <div class="empty-player">
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

function showEmbedFallback(videoId) {
  const youtubeUrl =
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  playerContainer.innerHTML = `
    <div class="embed-fallback">
      <h3>Can't play this video here</h3>
      <p>This video may restrict embedding or have other playback restrictions.</p>
      <a
        class="youtube-fallback"
        href="${youtubeUrl}"
        target="_blank"
        rel="noopener noreferrer">
        ▶ Watch on YouTube
      </a>
    </div>
  `;
}

function playVideo(videoId) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    showMessage("Invalid YouTube video ID.");
    return;
  }

  const youtubeUrl =
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  playerContainer.innerHTML = `
    <div class="video-frame-wrapper">
      <iframe
        src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}"
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen>
      </iframe>
    </div>

    <div class="video-actions">
      <a
        class="youtube-fallback"
        href="${youtubeUrl}"
        target="_blank"
        rel="noopener noreferrer">
        ▶ Open on YouTube
      </a>
    </div>
  `;

  // Browsers generally do not report YouTube's internal
  // "Video unavailable" message as an iframe error event.
}

function addVideo(event) {
  if (event) event.preventDefault();

  const url = videoInput?.value.trim();

  if (!url) {
    showMessage("Please paste a YouTube link first.");
    videoInput?.focus();
    return;
  }

  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    showMessage("Invalid YouTube link. Please check the URL.");
    return;
  }

  const video = {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    addedAt: Date.now()
  };

  videoHistory = [
    video,
    ...videoHistory.filter((item) => item.id !== videoId)
  ].slice(0, 20);

  saveHistory();
  renderHistory();
  playVideo(videoId);

  if (videoInput) videoInput.value = "";
}

function renderHistory(filter = "") {
  if (!historyContainer) return;

  const normalizedFilter = filter.toLowerCase();

  const filteredVideos = videoHistory.filter((video) =>
    video.id.toLowerCase().includes(normalizedFilter)
  );

  const count = document.getElementById("historyCount");

  if (count) count.textContent = videoHistory.length;

  if (filteredVideos.length === 0) {
    historyContainer.innerHTML = `
      <p class="history-empty">
        ${videoHistory.length
          ? "No matching videos found."
          : "Your recent videos will appear here."}
      </p>
    `;
    return;
  }

  historyContainer.innerHTML = filteredVideos
    .map((video) => `
      <div class="history-item">
        <button
          type="button"
          class="history-video"
          data-video-id="${escapeHTML(video.id)}"
          aria-label="Play video">
          <img
            src="https://img.youtube.com/vi/${encodeURIComponent(video.id)}/mqdefault.jpg"
            alt="YouTube thumbnail"
            loading="lazy">
          <span class="history-title">YouTube video</span>
        </button>

        <button
          type="button"
          class="remove-history"
          data-remove-id="${escapeHTML(video.id)}"
          aria-label="Remove video from history">
          ×
        </button>
      </div>
    `)
    .join("");
}

if (addVideoBtn) {
  addVideoBtn.addEventListener("click", addVideo);
}

if (videoInput) {
  videoInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addVideo();
    }
  });
}

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    renderHistory(event.target.value.trim());
  });
}

if (historyContainer) {
  historyContainer.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-id]");

    if (removeButton) {
      const videoId = removeButton.dataset.removeId;

      videoHistory = videoHistory.filter(
        (video) => video.id !== videoId
      );

      saveHistory();
      renderHistory(searchInput?.value.trim() || "");
      return;
    }

    const videoButton = event.target.closest("[data-video-id]");

    if (videoButton) {
      playVideo(videoButton.dataset.videoId);
    }
  });
}

renderHistory();
