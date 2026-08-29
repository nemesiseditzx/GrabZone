(() => {
  'use strict';

  function initGrabZoneLocations() {
    const division = document.getElementById('division');
    const district = document.getElementById('district');
    const upazila = document.getElementById('upazila');
    const data = window.GRABZONE_BD_LOCATIONS?.data;

    if (!division || !district || !upazila || !Array.isArray(data)) {
      console.error('GrabZone location data is unavailable.');
      return;
    }

    const text = value => String(value ?? '').trim();

    const name = item => {
      const en = text(item?.name?.en);
      const local = text(item?.name?.local);
      return en || local;
    };

    const divisions = data;

    function findDivision() {
      const value = text(division.value);
      return divisions.find(d => name(d) === value || text(d?.name?.local) === value);
    }

    function findDistrict() {
      const d = findDivision();
      const value = text(district.value);
      return d?.district?.find(x => name(x) === value || text(x?.name?.local) === value);
    }

    function setOptions(select, items, placeholder) {
      select.innerHTML = '';
      select.add(new Option(placeholder, ''));
      (items || []).forEach(item => {
        const label = name(item);
        if (label) select.add(new Option(label, label));
      });
    }

    function updateDistricts() {
      const d = findDivision();
      setOptions(district, d?.district, 'Select District');
      district.disabled = !d;

      setOptions(upazila, [], 'Select Upazila / Thana');
      upazila.disabled = true;
    }

    function updateUpazilas() {
      const d = findDistrict();
      setOptions(upazila, d?.upazila, 'Select Upazila / Thana');
      upazila.disabled = !d;
    }

    // Rebuild Division too, so this works even if another script failed earlier.
    setOptions(division, divisions, 'Select Division');
    district.disabled = true;
    upazila.disabled = true;

    division.addEventListener('change', updateDistricts);
    district.addEventListener('change', updateUpazilas);

    // Also expose a tiny diagnostic for browser testing.
    window.GRABZONE_LOCATION_READY = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGrabZoneLocations, { once: true });
  } else {
    initGrabZoneLocations();
  }
})();