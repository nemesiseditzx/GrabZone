   NOTICE BOARD
   FINAL — single sequence, no clone, no CSS-keyframe conflict
========================================================= */

async function loadNotices() {
  const track = document.getElementById("noticeTrack");
  const section = document.getElementById("noticeSection");

  if (!track) return;

  try {
    /*
      Notices are part of the same D1 system used by Admin.
      Prefer the shared D1 client so Admin -> D1 -> storefront
      always reads the same records.
    */
    let result = null;

    if (window.grabzoneD1?.from) {
      result = await window.grabzoneD1
        .from("notices")
        .select("*")
        .eq("active", true)
        .order("sort_order");
    } else if (typeof sb !== "undefined" && sb) {
      result = await sb
        .from("notices")
        .select("*")
        .eq("active", true)
        .order("sort_order");
    }

    if (!result || result.error) {
      throw new Error(result?.error?.message || "Notice database request failed.");
    }

    const notices = Array.isArray(result.data) ? result.data : [];

    if (!notices.length) {
      track.innerHTML = "";
      if (section) section.style.display = "none";
      return;
    }

    if (section) section.style.display = "flex";

    /* Cancel any previous notice animation before replacing the list. */
    if (window.__grabzoneNoticeAnimation) {
      try { window.__grabzoneNoticeAnimation.cancel(); } catch {}
      window.__grabzoneNoticeAnimation = null;
    }

    document.getElementById("gzNoticeStyle")?.remove();

    const style = document.createElement("style");
    style.id = "gzNoticeStyle";
    style.textContent = `
      #noticeTrack {
        position: relative !important;
        overflow: hidden !important;
        width: 100% !important;
        min-width: 0 !important;
        height: 100% !important;
        display: block !important;
        white-space: nowrap !important;
      }
      #gzNoticeMoving {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        width: max-content !important;
        min-width: max-content !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        white-space: nowrap !important;
        animation: none !important;
        transition: none !important;
        will-change: transform !important;
      }
      .gzNoticeItem {
        display: inline-flex !important;
        align-items: center !important;
        flex: 0 0 auto !important;
        width: max-content !important;
        min-width: max-content !important;
        margin: 0 100px 0 0 !important;
        padding: 0 !important;
        white-space: nowrap !important;
        font-size: 13px !important;
        line-height: 1 !important;
      }
      .gzNoticeItem b {
        display: inline-block !important;
        flex: 0 0 auto !important;
        margin: 0 12px 0 0 !important;
        padding: 0 !important;
        font-weight: 900 !important;
        white-space: nowrap !important;
      }
      .gzNoticeMessage {
        display: inline-block !important;
        flex: 0 0 auto !important;
        white-space: nowrap !important;
      }
      .gzNoticeItem::before,
      .gzNoticeItem::after {
        content: none !important;
        display: none !important;
      }
      @media (max-width: 600px) {
        .gzNoticeItem { margin-right: 60px !important; font-size: 10px !important; }
        .gzNoticeItem b { margin-right: 8px !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        #gzNoticeMoving { animation: none !important; }
      }
    `;
    document.head.appendChild(style);

    const escNotice = value => String(value ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#039;"
    }[m]));

    track.innerHTML = `
      <div id="gzNoticeMoving">${notices.map(notice => `
        <span class="gzNoticeItem">
          <b>${escNotice(notice.title)}</b>
          <span class="gzNoticeMessage">${escNotice(notice.message)}</span>
        </span>
      `).join("")}</div>
    `;

    const moving = document.getElementById("gzNoticeMoving");
    if (!moving) return;

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const trackWidth = track.getBoundingClientRect().width;
    const noticeWidth = moving.getBoundingClientRect().width;
    if (!trackWidth || !noticeWidth) return;

    const startX = trackWidth;
    const endX = -noticeWidth;
    const speed = window.innerWidth <= 600 ? 130 : 165;
    const duration = Math.max(3000, ((startX - endX) / speed) * 1000);

    moving.style.transform = `translate3d(${startX}px,0,0)`;

    const startAnimation = () => {
      if (window.__grabzoneNoticeStopped) return;
      const animation = moving.animate(
        [
          {transform:`translate3d(${startX}px,0,0)`},
          {transform:`translate3d(${endX}px,0,0)`}
        ],
        {duration,iterations:1,easing:"linear",fill:"forwards"}
      );
      window.__grabzoneNoticeAnimation = animation;
      animation.onfinish = () => {
        if (window.__grabzoneNoticeAnimation !== animation) return;
        startAnimation();
      };
    };

    window.__grabzoneNoticeStopped = false;
    startAnimation();
  } catch (error) {
    console.error("GrabZone notice board:", error);
    track.innerHTML = "";
    if (section) section.style.display = "none";
  }
}  NOTICE BOARD
   FINAL — single sequence, no clone, no CSS-keyframe conflict
========================================================= */

async function loadNotices() {
  const track = document.getElementById("noticeTrack");

  if (!track || !sb) return;

  const { data, error } = await sb
    .from("notices")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  if (error) {
    console.error("Notice error:", error);
    track.innerHTML = "";
    return;
  }

  const notices = data || [];

  if (!notices.length) {
    track.innerHTML = "";
    return;
  }

  /* Cancel any previous notice animation. */
  if (window.__grabzoneNoticeAnimation) {
    try {
      window.__grabzoneNoticeAnimation.cancel();
    } catch (e) {
      console.warn("Could not cancel previous notice animation:", e);
    }
    window.__grabzoneNoticeAnimation = null;
  }

  /* Cleanly replace only our notice styles. */
  document.getElementById("gzNoticeStyle")?.remove();

  const style = document.createElement("style");
  style.id = "gzNoticeStyle";