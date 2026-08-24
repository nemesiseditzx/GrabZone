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

  if (!base) {
    return "#";
  }

  return (
    base +
    "?text=" +
    encodeURIComponent(text)
  );
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

    console.error(
      "Website loading error:",
      error
    );

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
    console.error(
      "Settings error:",
      error
    );
    return;
  }

  if (data) {
    SITE = data;
  }
}


/* =========================================================
   TEXT / LINK HELPERS
========================================================= */

function setText(id, value) {

  const element =
    document.getElementById(id);

  if (
    element &&
    value !== null &&
    value !== undefined
  ) {
    element.textContent = value;
  }
}


function setHref(id, value) {

  const element =
    document.getElementById(id);

  if (
    element &&
    value
  ) {
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


  /* Store name */

  setText(
    "storeName",
    storeName
  );

  setText(
    "footerName",
    storeName
  );

  setText(
    "heroBrand",
    storeName
  );


  /* Hero */

  setText(
    "heroEyebrow",
    SITE.hero_eyebrow
  );

  setText(
    "heroTitle",
    SITE.hero_title
  );

  setText(
    "heroTitleEm",
    SITE.hero_title_em
  );

  setText(
    "heroDescription",
    SITE.hero_description
  );


  /* Offer */

  setText(
    "offerTitle",
    SITE.offer_title
  );

  setText(
    "offerMessage",
    SITE.offer_message
  );

  setText(
    "offerCode",
    SITE.offer_code
  );


  /* Collection */

  setText(
    "collectionEyebrow",
    SITE.collection_eyebrow
  );

  setText(
    "collectionTitle",
    SITE.collection_title
  );


  /* How to order */

  setText(
    "howEyebrow",
    SITE.how_eyebrow
  );

  setText(
    "howTitle",
    SITE.how_title
  );

  setText(
    "step1Title",
    SITE.step1_title
  );

  setText(
    "step1Body",
    SITE.step1_body
  );

  setText(
    "step2Title",
    SITE.step2_title
  );

  setText(
    "step2Body",
    SITE.step2_body
  );

  setText(
    "step3Title",
    SITE.step3_title
  );

  setText(
    "step3Body",
    SITE.step3_body
  );


  /* Referral */

  setText(
    "referralEyebrow",
    SITE.referral_eyebrow
  );

  setText(
    "referralTitle",
    SITE.referral_title
  );

  setText(
    "referralBody",
    SITE.referral_body
  );

  setText(
    "refDm",
    SITE.referral_button_text
  );


  /* Footer */

  setText(
    "footerText",
    SITE.footer_text
  );


  /* Navigation */

  setText(
    "nav1",
    SITE.header_link1_label
  );

  setText(
    "nav2",
    SITE.header_link2_label
  );

  setText(
    "nav3",
    SITE.header_link3_label
  );

  setHref(
    "nav1",
    SITE.header_link1_url
  );

  setHref(
    "nav2",
    SITE.header_link2_url
  );

  setHref(
    "nav3",
    SITE.header_link3_url
  );


  /* Hero buttons */

  setText(
    "heroButton",
    SITE.hero_button_text
  );

  setHref(
    "heroButton",
    SITE.hero_button_link
  );

  setText(
    "howButton",
    SITE.how_button_text
  );

  setHref(
    "howButton",
    SITE.how_button_link
  );


  /* Logo */

  if (SITE.logo_url) {

    [
      "brandMark",
      "footerMark"
    ].forEach(id => {

      const element =
        document.getElementById(id);

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


  /* Social links */

  const socialLinks = [

    [
      "headerDm",
      SITE.whatsapp || C?.whatsapp
    ],

    [
      "wa",
      SITE.whatsapp || C?.whatsapp
    ],

    [
      "ig",
      SITE.instagram || C?.instagram
    ],

    [
      "ms",
      SITE.messenger || C?.messenger
    ]

  ];


  socialLinks.forEach(
    ([id, url]) => {

      setHref(
        id,
        url || "#"
      );

    }
  );


  /* Hero image */

  if (SITE.hero_image_url) {

    const hero =
      document.getElementById(
        "heroCard"
      );

    if (hero) {

      hero.style.backgroundImage =
        `url("${escAttr(
          SITE.hero_image_url
        )}")`;

      hero.style.backgroundSize =
        "cover";

      hero.style.backgroundPosition =
        "center";

    }

  }


  /* Visibility */

  const visibility = [

    [
      "noticeSection",
      SITE.show_notice
    ],

    [
      "offers",
      SITE.show_offer
    ],

    [
      "how",
      SITE.show_how
    ],

    [
      "referralSection",
      SITE.show_referral
    ]

  ];


  visibility.forEach(
    ([id, value]) => {

      const element =
        document.getElementById(id);

      if (!element) return;

      element.style.display =
        value === false
          ? "none"
          : "";

    }
  );

}


/* =========================================================
   LOAD PRODUCTS
========================================================= */

async function loadProducts() {

  const {
    data,
    error
  } = await sb
    .from("products")
    .select("*")
    .eq("published", true)
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      "Products error:",
      error
    );

    allProducts = [];

    renderProducts();

    return;
  }


  allProducts =
    data || [];


  renderProducts();
}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts() {

  const grid =
    document.getElementById(
      "products"
    );

  if (!grid) return;


  /* Search */

  const searchInput =
    document.getElementById(
      "search"
    );

  const query =
    (
      searchInput?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  /* Active category */

  const selectedCategory =
    String(
      activeCategory || "All"
    )
      .trim()
      .toLowerCase();


  /* Filter products */

  const filtered =
    allProducts.filter(
      product => {

        const productCategory =
          String(
            product.category || ""
          )
            .trim()
            .toLowerCase();


        const categoryMatches =
          selectedCategory === "all" ||
          productCategory ===
            selectedCategory;


        const searchableText =
          `
            ${product.name || ""}
            ${product.category || ""}
            ${product.description || ""}
            ${product.tag || ""}
          `
            .toLowerCase();


        const searchMatches =
          searchableText.includes(
            query
          );


        return (
          categoryMatches &&
          searchMatches
        );

      }
    );


  /* Render products */

  grid.innerHTML =
    filtered
      .map(product => {

        const price =
          Number(
            product.price || 0
          ).toLocaleString();


        const oldPrice =
          product.old_price
            ? `
              <span class="old">
                ৳${Number(
                  product.old_price
                ).toLocaleString()}
              </span>
            `
            : "";


        const tag =
          product.tag
            ? `
              <span class="product-tag">
                ${esc(product.tag)}
              </span>
            `
            : "";


        return `

          <a
            class="product-card"
            href="product.html?id=${encodeURIComponent(
              product.id
            )}"
          >

            <div class="product-image">

              <img
                src="${escAttr(
                  product.image_url
                )}"
                alt="${escAttr(
                  product.name
                )}"
                loading="lazy"
              >

            </div>


            <div class="product-info">

              <div class="product-cat">
                ${esc(
                  product.category
                )}
              </div>


              <div class="product-name">
                ${esc(
                  product.name
                )}
              </div>


              ${tag}


              <div class="price">

                ৳${price}

                ${oldPrice}

              </div>

            </div>

          </a>

        `;

      })
      .join("");


  /* Empty state */

  const empty =
    document.getElementById(
      "empty"
    );

  if (empty) {

    empty.classList.toggle(
      "hidden",
      filtered.length > 0
    );

  }


  /* Render categories */

  renderCategories();

}


/* =========================================================
   RENDER CATEGORY BUTTONS
========================================================= */

function renderCategories() {

  const container =
    document.getElementById(
      "categories"
    );

  if (!container) return;


  /* Get unique categories */

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


  /* Clear old buttons */

  container.innerHTML = "";


  /* Create buttons */

  categories.forEach(
    category => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "chip";


      const isActive =
        String(category)
          .toLowerCase() ===
        String(activeCategory)
          .toLowerCase();


      if (isActive) {

        button.classList.add(
          "active"
        );

      }


      button.textContent =
        category;


      /* IMPORTANT:
         Real event listener.
         No inline onclick.
      */

      button.addEventListener(
        "click",
        function(event) {

          event.preventDefault();

          event.stopPropagation();


          activeCategory =
            category;


          /* Re-render */

          renderProducts();

        }
      );


      container.appendChild(
        button
      );

    }
  );

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

  const search =
    document.getElementById(
      "search"
    );

  if (!search) return;


  search.addEventListener(
    "input",
    function() {

      renderProducts();

    }
  );

}


/* =========================================================
   NOTICES
========================================================= */

async function loadNotices() {

  const element =
    document.getElementById(
      "noticeTrack"
    );

  if (!element) return;


  const {
    data,
    error
  } = await sb
    .from("notices")
    .select("*")
    .eq("active", true)
    .order(
      "sort_order"
    );


  if (error) {

    console.error(
      "Notice error:",
      error
    );

    element.innerHTML = "";

    return;
  }


  element.innerHTML =
    (data || [])
      .map(
        notice => `

          <span
            class="notice-item"
          >

            <b>
              ${esc(
                notice.title
              )}
            </b>

            ${esc(
              notice.message
            )}

          </span>

        `
      )
      .join("");

}


/* =========================================================
   PRODUCT DETAIL PAGE
========================================================= */

async function renderDetail() {

  const element =
    document.getElementById(
      "productDetail"
    );


  if (
    !element ||
    !sb
  ) {
    return;
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const productId =
    params.get("id");


  if (!productId) {
    return;
  }


  /* Load product */

  const {
    data: product,
    error
  } = await sb
    .from("products")
    .select("*")
    .eq(
      "id",
      productId
    )
    .eq(
      "published",
      true
    )
    .maybeSingle();


  if (
    error ||
    !product
  ) {

    element.innerHTML =
      "<h1>Product not found</h1>";

    return;
  }


  /* Load gallery */

  const {
    data: images
  } = await sb
    .from("product_images")
    .select("*")
    .eq(
      "product_id",
      productId
    )
    .order(
      "sort_order"
    );


  const gallery =
    images &&
    images.length
      ? images
      : [
          {
            image_url:
              product.image_url,

            is_main:
              true
          }
        ];


  /* Currency */

  const currency =
    SITE.currency ||
    "৳";


  document.title =
    product.name +
    " — " +
    (
      SITE.store_name ||
      "GRABZONE"
    );


  /* Detail page */

  element.innerHTML = `

    <div class="detail-grid">


      <!-- GALLERY -->

      <div class="gallery">


        <div class="gallery-thumbs">

          ${gallery
            .map(
              (image, index) => `

                <button
                  type="button"
                  class="gallery-thumb ${
                    index === 0
                      ? "active"
                      : ""
                  }"
                  onclick="showGalleryImage(${index});return false;"
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
            )
            .join("")}

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


      <!-- PRODUCT INFORMATION -->

      <div>


        <div class="eyebrow">

          ${esc(
            product.category
          )}

        </div>


        <h1>

          ${esc(
            product.name
          )}

        </h1>


        ${
          product.tag
            ? `
              <span class="tag">

                ${esc(
                  product.tag
                )}

              </span>
            `
            : ""
        }


        <div class="detail-price">

          ${esc(
            currency
          )}

          ${Number(
            product.price
          ).toLocaleString()}


          ${
            product.old_price
              ? `
                <span class="old">

                  ${esc(
                    currency
                  )}

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
            product.description ||
            ""
          )}

        </p>


        <!-- ORDER BOX -->

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


  /* Store gallery */

  window.__gallery =
    gallery;


  /* Order button */

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
   PRODUCT GALLERY SWITCH
========================================================= */

function showGalleryImage(index) {

  const gallery =
    window.__gallery ||
    [];


  if (!gallery[index]) {
    return;
  }


  const mainImage =
    document.getElementById(
      "mainProductImage"
    );


  if (mainImage) {

    mainImage.src =
      gallery[index].image_url;

  }


  const thumbs =
    document.querySelectorAll(
      ".gallery-thumb"
    );


  thumbs.forEach(
    (thumb, i) => {

      thumb.classList.toggle(
        "active",
        i === index
      );

    }
  );

}


/* =========================================================
   RESET CATEGORY
========================================================= */

function resetCategory() {

  activeCategory =
    "All";

  renderProducts();

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    setupSearch();

    load();

  }
);
