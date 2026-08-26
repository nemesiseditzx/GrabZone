let sb = null;
let allProducts = [];
let activeCategory = "All";
let SITE = {};

const C = window.GRABZONE_CONFIG;

if (
  C &&
  !C.supabaseUrl.includes("PASTE_") &&
  window.supabase
) {
  sb = window.supabase.createClient(
    C.supabaseUrl,
    C.supabaseAnonKey
  );
}

/* =========================================================
   HELPERS
========================================================= */

function esc(x) {
  return String(x ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m])
  );
}

function escAttr(x) {
  return esc(x).replace(/`/g, "&#96;");
}

function dmLink(text) {
  const base = SITE.whatsapp || C?.whatsapp || "";

  if (!base) return "#";

  return base + "?text=" + encodeURIComponent(text);
}

/* =========================================================
   MAIN LOAD
========================================================= */

async function load() {
  if (!sb) {
    console.error("Supabase is not configured.");
    return;
  }

  try {
    await loadSettings();
    applySiteSettings();

    await Promise.all([
      loadProducts(),
      loadNotices()
    ]);

    await renderDetail();
  } catch (error) {
    console.error("Website loading error:", error);
  }
}

/* =========================================================
   SITE SETTINGS
========================================================= */

async function loadSettings() {
  const { data, error } = await sb
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Settings error:", error);
    return;
  }

  if (data) SITE = data;
}

/* =========================================================
   TEXT / LINK HELPERS
========================================================= */

function setText(id, value) {
  const element = document.getElementById(id);

  if (
    element &&
    value !== null &&
    value !== undefined
  ) {
    element.textContent = value;
  }
}

function setHref(id, value) {
  const element = document.getElementById(id);

  if (element && value) {
    element.href = value;
  }
}

/* =========================================================
   APPLY WEBSITE SETTINGS
========================================================= */

function applySiteSettings() {
  const storeName =
    SITE.store_name ||
    C?.storeName ||
    "GRABZONE";

  document.title = storeName;

  setText("storeName", storeName);
  setText("footerName", storeName);
  setText("heroBrand", storeName);

  setText("heroEyebrow", SITE.hero_eyebrow);
  setText("heroTitle", SITE.hero_title);
  setText("heroTitleEm", SITE.hero_title_em);
  setText("heroDescription", SITE.hero_description);

  setText("offerTitle", SITE.offer_title);
  setText("offerMessage", SITE.offer_message);
  setText("offerCode", SITE.offer_code);

  setText("collectionEyebrow", SITE.collection_eyebrow);
  setText("collectionTitle", SITE.collection_title);

  setText("howEyebrow", SITE.how_eyebrow);
  setText("howTitle", SITE.how_title);

  setText("step1Title", SITE.step1_title);
  setText("step1Body", SITE.step1_body);
  setText("step2Title", SITE.step2_title);
  setText("step2Body", SITE.step2_body);
  setText("step3Title", SITE.step3_title);
  setText("step3Body", SITE.step3_body);

  setText("referralEyebrow", SITE.referral_eyebrow);
  setText("referralTitle", SITE.referral_title);
  setText("referralBody", SITE.referral_body);
  setText("refDm", SITE.referral_button_text);

  setText("footerText", SITE.footer_text);

  setText("nav1", SITE.header_link1_label);
  setText("nav2", SITE.header_link2_label);
  setText("nav3", SITE.header_link3_label);

  setHref("nav1", SITE.header_link1_url);
  setHref("nav2", SITE.header_link2_url);
  setHref("nav3", SITE.header_link3_url);

  setText("heroButton", SITE.hero_button_text);
  setHref("heroButton", SITE.hero_button_link);

  setText("howButton", SITE.how_button_text);
  setHref("howButton", SITE.how_button_link);

  if (SITE.logo_url) {
    ["brandMark", "footerMark"].forEach(id => {
      const element = document.getElementById(id);

      if (!element) return;

      element.innerHTML = `
        <img
          src="${escAttr(SITE.logo_url)}"
          alt="${escAttr(storeName)}"
          style="
            width:100%;
            height:100%;
            object-fit:contain;
            border-radius:inherit;
          "
        >
      `;
    });
  }

  [
    ["headerDm", SITE.whatsapp || C?.whatsapp],
    ["wa", SITE.whatsapp || C?.whatsapp],
    ["ig", SITE.instagram || C?.instagram],
    ["ms", SITE.messenger || C?.messenger]
  ].forEach(([id, url]) => {
    setHref(id, url || "#");
  });

  if (SITE.hero_image_url) {
    const hero = document.getElementById("heroCard");

    if (hero) {
      hero.style.backgroundImage =
        `url("${escAttr(SITE.hero_image_url)}")`;

      hero.style.backgroundSize = "cover";
      hero.style.backgroundPosition = "center";
    }
  }

  [
    ["noticeSection", SITE.show_notice],
    ["offers", SITE.show_offer],
    ["how", SITE.show_how],
    ["referralSection", SITE.show_referral]
  ].forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (!element) return;

    element.style.display =
      value === false ? "none" : "";
  });
}

/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts() {
  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Products error:", error);
    allProducts = [];
    renderProducts();
    return;
  }

  allProducts = data || [];
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("products");

  if (!grid) return;

  const searchInput =
    document.getElementById("search");

  const query =
    (searchInput?.value || "")
      .trim()
      .toLowerCase();

  const selectedCategory =
    String(activeCategory || "All")
      .trim()
      .toLowerCase();

  const filtered = allProducts.filter(product => {
    const category =
      String(product.category || "")
        .trim()
        .toLowerCase();

    const categoryMatches =
      selectedCategory === "all" ||
      category === selectedCategory;

    const searchableText = `
      ${product.name || ""}
      ${product.category || ""}
      ${product.description || ""}
      ${product.tag || ""}
    `.toLowerCase();

    return (
      categoryMatches &&
      searchableText.includes(query)
    );
  });

  grid.innerHTML = filtered.map(product => {
    const price =
      Number(product.price || 0)
        .toLocaleString();

    const oldPrice = product.old_price
      ? `
        <span class="old">
          ৳${Number(product.old_price).toLocaleString()}
        </span>
      `
      : "";

    const tag = product.tag
      ? `
        <span class="product-tag">
          ${esc(product.tag)}
        </span>
      `
      : "";

    return `
      <a
        class="product-card"
        href="product.html?id=${encodeURIComponent(product.id)}"
      >
        <div class="product-image">
          <img
            src="${escAttr(product.image_url)}"
            alt="${escAttr(product.name)}"
            loading="lazy"
          >
        </div>

        <div class="product-info">
          <div class="product-cat">
            ${esc(product.category)}
          </div>

          <div class="product-name">
            ${esc(product.name)}
          </div>

          ${tag}

          <div class="price">
            ৳${price}
            ${oldPrice}
          </div>
        </div>
      </a>
    `;
  }).join("");

  const empty =
    document.getElementById("empty");

  if (empty) {
    empty.classList.toggle(
      "hidden",
      filtered.length > 0
    );
  }

  renderCategories();
}

function renderCategories() {
  const container =
    document.getElementById("categories");

  if (!container) return;

  const categories = [
    "All",
    ...new Set(
      allProducts
        .map(product =>
          String(
            product.category || ""
          ).trim()
        )
        .filter(Boolean)
    )
  ];

  container.innerHTML = "";

  categories.forEach(category => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className = "chip";

    if (
      String(category).toLowerCase() ===
      String(activeCategory).toLowerCase()
    ) {
      button.classList.add("active");
    }

    button.textContent = category;

    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      activeCategory = category;
      renderProducts();
    });

    container.appendChild(button);
  });
}

function setupSearch() {
  const search =
    document.getElementById("search");

  if (!search) return;

  search.addEventListener(
    "input",
    renderProducts
  );
}

/* =========================================================
   NOTICE BOARD
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

  /* Stop previous animation */
  if (window.__grabzoneNoticeAnimation) {
    try {
      window.__grabzoneNoticeAnimation.cancel();
    } catch (e) {}
  }

  /* =====================================================
     ONLY ONE COPY
     No clone.
  ===================================================== */

  const html = notices.map(n => `
    <span class="gzNoticeItem">
      <b>${esc(n.title)}</b>
      <span class="gzNoticeMessage">
        ${esc(n.message)}
      </span>
    </span>
  `).join("");

  track.innerHTML = `
    <div id="gzNoticeMoving">
      ${html}
    </div>
  `;

  /* Remove previous custom style */
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

      top: 50% !important;

      left: 0 !important;

      display: inline-flex !important;
      align-items: center !important;

      width: max-content !important;
      min-width: max-content !important;

      height: max-content !important;

      margin: 0 !important;
      padding: 0 !important;

      white-space: nowrap !important;

      transform: translate3d(0, -50%, 0) !important;

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

      margin-right: 100px !important;

      padding: 0 !important;

      white-space: nowrap !important;

      font-size: 13px !important;
      line-height: 1 !important;
    }

    .gzNoticeItem b {
      display: inline-block !important;

      margin-right: 12px !important;

      font-weight: 900 !important;

      white-space: nowrap !important;
    }

    .gzNoticeMessage {
      white-space: nowrap !important;
    }

    .gzNoticeItem::before,
    .gzNoticeItem::after {
      content: none !important;
      display: none !important;
    }

    @media (max-width: 600px) {

      .gzNoticeItem {
        font-size: 10px !important;
        margin-right: 60px !important;
      }

      .gzNoticeItem b {
        margin-right: 8px !important;
      }

    }
  `;

  document.head.appendChild(style);

  const moving =
    document.getElementById("gzNoticeMoving");

  if (!moving) return;

  /*
    Wait until browser finishes layout.
  */
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

  const trackWidth =
    track.getBoundingClientRect().width;

  const noticeWidth =
    moving.getBoundingClientRect().width;

  if (!trackWidth || !noticeWidth) return;

  /*
    Start completely outside the RIGHT.
  */
  const startX = trackWidth;

  /*
    Finish completely outside the LEFT.
  */
  const endX = -noticeWidth;

  const distance =
    startX - endX;

  /*
    Speed.
  */
  const speed =
    window.innerWidth <= 600
      ? 105
      : 125;

  const duration =
    Math.max(
      5000,
      (distance / speed) * 1000
    );

  /*
    Put notice at the right edge.
  */
 moving.style.transform =
  `translate3d(${startX}px, 0, 0)`;

/*
  ONE notice sequence.
  No duplicate.
*/
const animation = moving.animate(
  [
    {
      transform:
        `translate3d(${startX}px, 0, 0)`
    },
    {
      transform:
        `translate3d(${endX}px, 0, 0)`
    }
  ],
  {
    duration: duration,
    iterations: 1,
    easing: "linear",
    fill: "forwards"
  }
);

window.__grabzoneNoticeAnimation =
  animation;
      }
    ],
    {
      duration: duration,
      iterations: 1,
      easing: "linear",
      fill: "forwards"
    }
  );

  window.__grabzoneNoticeAnimation =
    animation;

  /*
    When the complete notice sequence
    finishes, start again from the right.
  */
  animation.onfinish = () => {

    /*
      Re-run the same notice sequence.
      Still only ONE copy.
    */
    loadNotices();

  };
}
/* =========================================================
   PRODUCT DETAIL
========================================================= */

async function renderDetail() {
  const element =
    document.getElementById(
      "productDetail"
    );

  if (!element || !sb) return;

  const params =
    new URLSearchParams(
      window.location.search
    );

  const productId =
    params.get("id");

  if (!productId) return;

  const {
    data: product,
    error
  } = await sb
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("published", true)
    .maybeSingle();

  if (error || !product) {
    element.innerHTML =
      "<h1>Product not found</h1>";
    return;
  }

  const { data: images } =
    await sb
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");

  const gallery =
    images && images.length
      ? images
      : [
          {
            image_url:
              product.image_url,
            is_main: true
          }
        ];

  const currency =
    SITE.currency || "৳";

  document.title =
    product.name +
    " — " +
    (
      SITE.store_name ||
      "GRABZONE"
    );

  element.innerHTML = `
    <div class="detail-grid">

      <div class="gallery">

        <div class="gallery-thumbs">

          ${gallery.map(
            (image, index) => `
              <button
                type="button"
                class="gallery-thumb ${
                  index === 0
                    ? "active"
                    : ""
                }"
                onclick="
                  showGalleryImage(${index});
                  return false;
                "
              >
                <img
                  src="${escAttr(
                    image.image_url
                  )}"
                  alt="${escAttr(
                    product.name
                  )} ${index + 1}"
                >
              </button>
            `
          ).join("")}

        </div>

        <div class="gallery-main">

          <img
            id="mainProductImage"
            src="${escAttr(
              gallery[0].image_url
            )}"
            alt="${escAttr(
              product.name
            )}"
          >

        </div>

      </div>

      <div>

        <div class="eyebrow">
          ${esc(product.category)}
        </div>

        <h1>
          ${esc(product.name)}
        </h1>

        ${
          product.tag
            ? `
              <span class="tag">
                ${esc(product.tag)}
              </span>
            `
            : ""
        }

        <div class="detail-price">

          ${esc(currency)}
          ${Number(
            product.price
          ).toLocaleString()}

          ${
            product.old_price
              ? `
                <span class="old">

                  ${esc(currency)}
                  ${Number(
                    product.old_price
                  ).toLocaleString()}

                </span>
              `
              : ""
          }

        </div>

        <p class="detail-desc">
          ${esc(
            product.description || ""
          )}
        </p>

        <div class="dm-box">

          <strong>
            Have a referral code?
          </strong>

          <p>
            Enter it below so our team
            can verify it.
          </p>

          <input
            id="refCode"
            type="text"
            placeholder="Optional referral code"
            autocomplete="off"
          >

          <a
            class="btn btn-dark btn-full"
            target="_blank"
            rel="noopener"
            id="orderBtn"
          >
            DM to Order
          </a>

        </div>

      </div>

    </div>
  `;

  window.__gallery =
    gallery;

  const orderButton =
    document.getElementById(
      "orderBtn"
    );

  const referralInput =
    document.getElementById(
      "refCode"
    );

  function updateOrderLink() {
    const referral =
      referralInput?.value
        ?.trim() || "";

    let message =
      `I want to order: ${
        product.name
      } | Price: ${
        currency
      }${product.price}`;

    if (referral) {
      message +=
        ` | Referral code: ${referral}`;
    }

    orderButton.href =
      dmLink(message);
  }

  if (orderButton) {
    updateOrderLink();
  }

  if (referralInput) {
    referralInput.addEventListener(
      "input",
      updateOrderLink
    );
  }
}

/* =========================================================
   PRODUCT GALLERY
========================================================= */

function showGalleryImage(index) {
  const gallery =
    window.__gallery || [];

  if (!gallery[index]) return;

  const mainImage =
    document.getElementById(
      "mainProductImage"
    );

  if (mainImage) {
    mainImage.src =
      gallery[index].image_url;
  }

  document
    .querySelectorAll(
      ".gallery-thumb"
    )
    .forEach((thumb, i) => {
      thumb.classList.toggle(
        "active",
        i === index
      );
    });
}

/* =========================================================
   RESET CATEGORY
========================================================= */

function resetCategory() {
  activeCategory = "All";
  renderProducts();
}

/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupSearch();
    load();
  }
);
