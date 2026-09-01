/* =========================================================
   GRABZONE PRODUCT DISPLAY CONTROL
   Uses the existing authenticated D1 client `sb`.
========================================================= */

(function(){

  function gzPDMessage(text,color){
    const el = document.getElementById("gzProductDisplayMessage");
    if(!el) return;
    el.textContent = text || "";
    el.style.color = color || "#777";
  }

  async function gzPDSession(){
    if(typeof sb === "undefined" || !sb){
      throw new Error("Database service is not configured.");
    }

    const {data,error} =
      await sb.auth.getSession();

    if(error) throw error;

    if(!data?.session){
      throw new Error("Please sign in to the Admin Panel first.");
    }

    return sb;
  }

  function gzPDRandomSeed(){
    if(window.crypto?.getRandomValues){
      const a = new Uint32Array(3);
      window.crypto.getRandomValues(a);
      return Array.from(a)
        .map(x => x.toString(36))
        .join("-");
    }

    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2)
    );
  }

  function gzPDSetUI(row){
    const mode =
      String(row?.product_display_mode || "daily")
        .toLowerCase();

    const daily =
      document.getElementById(
        "gzProductDisplayDaily"
      );

    const manual =
      document.getElementById(
        "gzProductDisplayManual"
      );

    if(daily) daily.checked = mode !== "manual";
    if(manual) manual.checked = mode === "manual";

    const seed =
      document.getElementById(
        "gzProductDisplaySeed"
      );

    if(seed){
      seed.textContent =
        row?.product_shuffle_seed
          ? "Shuffle seed is active."
          : "Using the default seed.";
    }
  }

  async function gzPDLoad(){
    try{
      const client = await gzPDSession();

      const {data,error} =
        await client
          .from("site_settings")
          .select(
            "product_display_mode,product_shuffle_seed"
          )
          .eq("id",1)
          .maybeSingle();

      if(error) throw error;

      gzPDSetUI(data || {});
      gzPDMessage("");
    }catch(e){
      console.error(e);
      gzPDMessage(
        "⚠ " + (e.message || "Could not load display settings."),
        "#a00"
      );
    }
  }

  async function gzPDSaveMode(mode){
    try{
      const client = await gzPDSession();

      const {error} =
        await client
          .from("site_settings")
          .update({
            product_display_mode: mode
          })
          .eq("id",1);

      if(error) throw error;

      gzPDMessage(
        mode === "manual"
          ? "✓ Manual order mode enabled."
          : "✓ Daily automatic shuffle enabled.",
        "#176b2c"
      );

      await gzPDLoad();
    }catch(e){
      console.error(e);
      gzPDMessage(
        "⚠ " + (e.message || "Could not save display mode."),
        "#a00"
      );
    }
  }

  async function gzPDShuffleNow(){
    try{
      const client = await gzPDSession();

      const newSeed =
        gzPDRandomSeed();

      const {error} =
        await client
          .from("site_settings")
          .update({
            product_display_mode: "manual",
            product_shuffle_seed: newSeed
          })
          .eq("id",1);

      if(error) throw error;

      gzPDMessage(
        "✓ Product order shuffled. The new order is now active for everyone.",
        "#176b2c"
      );

      await gzPDLoad();
    }catch(e){
      console.error(e);
      gzPDMessage(
        "⚠ " + (e.message || "Shuffle failed."),
        "#a00"
      );
    }
  }

  function gzPDInject(){
    if(document.getElementById("gzProductDisplayPanel")){
      gzPDLoad();
      return;
    }

    const productsTab =
      document.getElementById("tab-products");

    if(!productsTab) return;

    const title =
      productsTab.querySelector(".page-title");

    if(!title) return;

    const panel =
      document.createElement("div");

    panel.id =
      "gzProductDisplayPanel";

    panel.className =
      "panel";

    panel.style.marginBottom =
      "16px";

    panel.innerHTML = `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:16px;
        flex-wrap:wrap;
      ">
        <div>
          <div style="
            font-size:11px;
            font-weight:900;
            letter-spacing:.14em;
            color:#777;
          ">
            HOMEPAGE DISPLAY
          </div>

          <h2 style="margin:5px 0 5px">
            Product Order
          </h2>

          <p style="
            margin:0;
            color:#777;
            font-size:13px;
            max-width:650px;
          ">
            Choose how products are arranged on the homepage.
            Daily Shuffle changes the order automatically each day.
            Manual mode keeps the current shuffled order until you shuffle again.
          </p>
        </div>

        <button
          type="button"
          class="primary"
          id="gzProductShuffleNow"
        >
          🔀 Shuffle Now
        </button>
      </div>

      <div style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:16px;
      ">
        <label style="
          display:flex;
          align-items:center;
          gap:8px;
          border:1px solid #ddd;
          border-radius:12px;
          padding:11px 14px;
          cursor:pointer;
          background:#fff;
        ">
          <input
            type="radio"
            name="gzProductDisplayMode"
            id="gzProductDisplayDaily"
          >
          <span>
            <b>Daily Automatic Shuffle</b><br>
            <small style="color:#777">
              Changes automatically every day
            </small>
          </span>
        </label>

        <label style="
          display:flex;
          align-items:center;
          gap:8px;
          border:1px solid #ddd;
          border-radius:12px;
          padding:11px 14px;
          cursor:pointer;
          background:#fff;
        ">
          <input
            type="radio"
            name="gzProductDisplayMode"
            id="gzProductDisplayManual"
          >
          <span>
            <b>Manual Shuffle</b><br>
            <small style="color:#777">
              Stays the same until you shuffle
            </small>
          </span>
        </label>
      </div>

      <div
        id="gzProductDisplaySeed"
        style="
          margin-top:10px;
          font-size:12px;
          color:#888;
        "
      ></div>

      <div
        id="gzProductDisplayMessage"
        style="
          min-height:20px;
          margin-top:8px;
          font-size:13px;
          font-weight:800;
        "
      ></div>
    `;

    title.insertAdjacentElement(
      "afterend",
      panel
    );

    document
      .getElementById("gzProductShuffleNow")
      ?.addEventListener(
        "click",
        gzPDShuffleNow
      );

    document
      .getElementById("gzProductDisplayDaily")
      ?.addEventListener(
        "change",
        function(){
          if(this.checked){
            gzPDSaveMode("daily");
          }
        }
      );

    document
      .getElementById("gzProductDisplayManual")
      ?.addEventListener(
        "change",
        function(){
          if(this.checked){
            gzPDSaveMode("manual");
          }
        }
      );

    gzPDLoad();
  }

  window.gzInitProductDisplayControl =
    gzPDInject;

  document.addEventListener(
    "DOMContentLoaded",
    gzPDInject
  );

})();
