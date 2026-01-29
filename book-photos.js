// 책 - 좋았던 페이지 사진 뷰
// 모든 그룹원의 photos를 렌더링 (친구도 내가 올린 사진 볼 수 있음)
// sessionStorage: 탭 세션 동안만 유지, index 새로고침 시 초기화됨 (Firebase Storage 교체 용이)

function $(sel) {
  return document.querySelector(sel);
}

function getPhotosData() {
  try {
    const raw = sessionStorage.getItem("bookPhotosData");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {}
  return { photos: [], roomTitle: "독서모임", currentUserId: null };
}

function savePhotosData(data) {
  sessionStorage.setItem("bookPhotosData", JSON.stringify(data));
}

/**
 * Firebase Storage로 교체 시 이 함수 내부 로직만 교체
 * 현재: URL.createObjectURL (blob) - 새로고침 시 URL 무효화됨
 */
async function uploadToStorage(file) {
  const url = URL.createObjectURL(file);
  return url;
}

let pendingPhotoQueue = [];

function addPhoto(file) {
  const data = getPhotosData();
  const currentUserId = data.currentUserId;
  uploadToStorage(file).then((src) => {
    pendingPhotoQueue.push({ src, memberId: currentUserId });
    if (pendingPhotoQueue.length === 1) {
      showPagePopup();
    }
  });
}

function showPagePopup() {
  if (pendingPhotoQueue.length === 0) return;
  const overlay = $("#pagePopupOverlay");
  const input = $("#pagePopupInput");
  if (overlay && input) {
    input.value = "";
    overlay.classList.remove("hidden");
    input.focus();
  }
}

function confirmPageAndAddPhoto() {
  const input = $("#pagePopupInput");
  const overlay = $("#pagePopupOverlay");
  if (!input || !overlay || pendingPhotoQueue.length === 0) return;

  const pageNum = input.value.trim();
  const photo = pendingPhotoQueue.shift();
  const data = getPhotosData();
  const photos = data.photos || [];
  photos.push({ src: photo.src, memberId: photo.memberId, pageNum });
  data.photos = photos;
  savePhotosData(data);
  render();

  overlay.classList.add("hidden");
  if (pendingPhotoQueue.length > 0) {
    showPagePopup();
  }
}

function render() {
  const data = getPhotosData();
  const photos = data.photos || [];
  const roomTitle = data.roomTitle || "독서모임";

  const carouselWrap = $("#carouselWrap");
  const carouselTrack = $("#carouselTrack");
  const emptyState = $("#emptyState");
  const pageIndicator = $("#pageIndicator");
  const photosTitle = $("#photosTitle");

  if (photosTitle) photosTitle.textContent = roomTitle;

  if (photos.length === 0) {
    carouselWrap?.classList.add("hidden");
    pageIndicator?.classList.add("hidden");
    emptyState?.classList.remove("hidden");
  } else {
    emptyState?.classList.add("hidden");
    pageIndicator?.classList.remove("hidden");
    carouselWrap?.classList.remove("hidden");

    const photoSlides = photos
      .map((p, i) => {
        const isOdd = i % 2 === 0;
        const sheetClass = isOdd ? "note-sheet-odd" : "note-sheet-even";
        const src = typeof p === "string" ? p : p.src;
        const pageNum = (p && p.pageNum !== undefined && p.pageNum !== "") ? p.pageNum : "";
        const pageText = pageNum ? `${pageNum} P` : "";
        return `
      <div class="carousel-slide" data-photo-index="${i}">
        <div class="note-sheet ${sheetClass}">
          <div class="slide-content">
            <img src="${src}" alt="공유된 페이지" class="slide-photo" />
            ${pageText ? `<div class="slide-page-text">${pageText}</div>` : ""}
          </div>
        </div>
      </div>
    `;
      })
      .join("");

    const addSlideIndex = photos.length;
    const addSlideOdd = addSlideIndex % 2 === 0;
    const addSheetClass = addSlideOdd ? "note-sheet-odd" : "note-sheet-even";
    const addSlide = `
      <div class="carousel-slide carousel-slide-add">
        <div class="note-sheet ${addSheetClass}"></div>
        <div class="sheet-add-zone">
          <button type="button" class="add-photo-btn" aria-label="사진 추가"><img src="./assets/plusbt.png" alt="" /></button>
          <p class="add-hint">좋았던 페이지를 공유해보세요</p>
        </div>
      </div>
    `;

    carouselTrack.innerHTML = photoSlides + addSlide;

    const totalSlides = photos.length + 1;
    if (pageIndicator) pageIndicator.textContent = `1 / ${totalSlides}`;
  }

}

function wireEvents() {
  const backBtn = $("#backBtn");
  const photoInput = $("#photoInput");

  backBtn?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "index.html";
    }
  });

  document.body.addEventListener("click", (e) => {
    if (e.target.closest(".add-photo-btn")) {
      photoInput?.click();
    }
  });

  photoInput?.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => addPhoto(file));
    e.target.value = "";
  });

  const pagePopupConfirm = $("#pagePopupConfirm");
  const pagePopupInput = $("#pagePopupInput");
  const pagePopupOverlay = $("#pagePopupOverlay");
  pagePopupConfirm?.addEventListener("click", confirmPageAndAddPhoto);
  pagePopupInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmPageAndAddPhoto();
  });
  pagePopupOverlay?.addEventListener("click", (e) => {
    if (e.target === pagePopupOverlay) {
      pendingPhotoQueue.shift();
      pagePopupOverlay.classList.add("hidden");
      if (pendingPhotoQueue.length > 0) showPagePopup();
    }
  });
}

function wireScrollIndicator() {
  const carouselWrap = $("#carouselWrap");
  const carouselTrack = $("#carouselTrack");
  const pageIndicator = $("#pageIndicator");
  carouselWrap?.addEventListener("scroll", () => {
    const slideWidth = carouselWrap.offsetWidth;
    const scrollLeft = carouselWrap.scrollLeft;
    const index = Math.round(scrollLeft / slideWidth);
    const count = carouselTrack?.children.length || 0;
    if (pageIndicator && count) pageIndicator.textContent = `${index + 1} / ${count}`;
  });
}

function init() {
  wireEvents();
  wireScrollIndicator();
  render();
}

init();
