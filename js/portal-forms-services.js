window.formatDateToDMY = function(isoStr) {
    const s = String(isoStr || '').trim();
    if (s.includes('-')) {
        const p = s.split('-');
        if (p.length === 3 && p[0].length === 4) return `${p[2]}-${p[1]}-${p[0]}`;
    }
    return s;
};

window.renderMainServiceFormHtml = function(serviceName, container, submitBtnText, statusTagHtml, getWatermarkHtml) {
    const todayISO = new Date().toISOString().split('T')[0];

    const vleSelectHtml = `
        <select name="VLE" onchange="window.toggleCustomInput(this, 'customVleInput')" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10">
            ${window.VLE_NAMES_LIST.map(v => `<option value="${v}">${v}</option>`).join('')}
            <option value="OTHER">OTHER (अन्य नाम दर्ज करें)</option>
        </select>
        <input type="text" id="customVleInput" name="VLE_CUSTOM" placeholder="VLE का नाम यहाँ लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
    `;

    const buildDobGroupSwitcherHtml = (activeDob) => {
        const items = [];
        if (window.canCurrentUserSeeService('minor')) items.push({ id: 'minor', label: '🎂 DOB Minor (₹50)' });
        if (window.canCurrentUserSeeService('dob_delhi')) items.push({ id: 'dob_delhi', label: '🏥 DOB Delhi (MCD • ₹50)' });
        if (window.canCurrentUserSeeService('dob_baraut')) items.push({ id: 'dob_baraut', label: '🏛️ Custom Date of Birth (Admin • ₹50)' });
        if (items.length <= 1) return '';

        const tabsHtml = items.map(it => {
            const isAct = (it.id === activeDob);
            return `<button type="button" onclick="window.switchService('${it.id}')" class="px-3.5 py-2 rounded-xl text-xs font-black transition flex-1 min-w-[140px] ${isAct ? 'bg-amber-400 text-dark-950 shadow-sm' : 'bg-dark-800 hover:bg-dark-700 text-slate-200 border border-slate-700'}">${it.label}</button>`;
        }).join('');

        const optsHtml = items.map(it => `<option value="${it.id}" ${it.id === activeDob ? 'selected' : ''}>${it.label}</option>`).join('');

        return `
            <div class="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-dark-950 to-slate-900 border border-amber-500/40 shadow-md relative z-20 space-y-2.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <label class="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <i class="fa-solid fa-cake-candles"></i> Birth Certificate (DOB) चुनें
                    </label>
                    <select onchange="window.switchService(this.value)" class="p-2 border border-slate-700 rounded-xl text-xs font-black bg-dark-900 text-white outline-none cursor-pointer focus:border-amber-400">
                        ${optsHtml}
                    </select>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${tabsHtml}
                </div>
            </div>`;
    };


    // 8 NEW RTYU API SERVICES
    const rtyuFormSpecs = {
        pan_find_bg: {
            title: 'PAN Find by Aadhaar', subtitle: '12-अंक आधार नंबर से PAN नंबर खोजें',
            serviceType: 'PAN Find', serviceKey: 'pan-find-bg', cost: 10, icon: 'fa-magnifying-glass', color: 'blue',
            fields: `<div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">12-Digit Aadhaar Number <span class="text-red-500">*</span></label><input type="text" name="aadhaar" maxlength="12" pattern="\\d{12}" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,12)" placeholder="123456789012" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-black tracking-widest bg-slate-50 focus:bg-white outline-none"></div>`
        },
        pan_details_prime: {
            title: 'PAN Details Prime', subtitle: 'PAN नंबर से Name, Father Name, Masked Aadhaar व DOB निकालें',
            serviceType: 'PAN Details Prime', serviceKey: 'pan-details-prime', cost: 20, icon: 'fa-id-card', color: 'indigo',
            fields: `<div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">10-Digit PAN Number <span class="text-red-500">*</span></label><input type="text" name="pan_number" maxlength="10" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')" placeholder="ABCDE1234F" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-black tracking-widest bg-slate-50 focus:bg-white outline-none uppercase"></div>`
        },
        mobile_to_uan: {
            title: 'Mobile to UAN Instant', subtitle: 'रजिस्टर्ड मोबाइल नंबर से तुरंत UAN नंबर निकालें',
            serviceType: 'Mobile to UAN', serviceKey: 'mobile-to-uan-num-instant', cost: 20, icon: 'fa-mobile-screen-button', color: 'emerald',
            fields: `<div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">10-Digit Mobile Number <span class="text-red-500">*</span></label><input type="tel" name="mobile" maxlength="10" pattern="\\d{10}" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10)" placeholder="9999999999" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-black tracking-widest bg-slate-50 focus:bg-white outline-none"></div>`
        },
        instant_voter_link: {
            title: 'Instant Voter Mobile Link', subtitle: 'EPIC नंबर के साथ तुरंत मोबाइल नंबर लिंक करें',
            serviceType: 'Instant Voter Link', serviceKey: 'instant-voter-mobile-link', cost: 30, icon: 'fa-link', color: 'teal',
            fields: `<div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Voter EPIC Number <span class="text-red-500">*</span></label><input type="text" name="epic_number" oninput="this.value=this.value.toUpperCase()" placeholder="AAU1229236" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-black bg-slate-50 focus:bg-white outline-none uppercase"></div>
                     <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">10-Digit Mobile Number <span class="text-red-500">*</span></label><input type="tel" name="mobile_number" maxlength="10" pattern="\\d{10}" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10)" placeholder="9999999999" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-black bg-slate-50 focus:bg-white outline-none"></div>`
        },
        ll_exam: {
            title: 'Learning Licence Exam', subtitle: 'LL Exam ऑर्डर सबमिट करें',
            serviceType: 'LL Exam', serviceKey: 'll-exam', cost: 70, icon: 'fa-car-side', color: 'amber',
            fields: `<div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Application Number <span class="text-red-500">*</span></label><input type="text" name="appno" placeholder="Enter Application No" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none"></div>
                     <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Password <span class="text-red-500">*</span></label><input type="text" name="password" placeholder="Enter Password" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none"></div>
                     <div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth <span class="text-red-500">*</span></label><input type="date" name="dob" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none"></div>`
        },
        dl_pdf: {
            title: 'Driving Licence PDF', subtitle: 'DL नंबर और जन्मतिथि से तुरंत Driving Licence PDF निकालें',
            serviceType: 'DL PDF', serviceKey: 'dl-pdf', cost: 10, icon: 'fa-id-badge', color: 'sky',
            fields: `<div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">DL Number <span class="text-red-500">*</span></label><input type="text" name="dl_number" oninput="this.value=this.value.toUpperCase()" placeholder="MH2120250001353" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-black bg-slate-50 focus:bg-white outline-none uppercase"></div>
                     <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth <span class="text-red-500">*</span></label><input type="date" name="dob" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none"></div>`
        },
        eshram_mobile: {
            title: 'e-Shram Mobile Update', subtitle: 'आधार और DOB से e-Shram कार्ड में नया मोबाइल नंबर अपडेट करें',
            serviceType: 'e-Shram Mobile Update', serviceKey: 'eshram-mobile-update', cost: 40, icon: 'fa-helmet-safety', color: 'orange',
            fields: `<div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">12-Digit Aadhaar Number <span class="text-red-500">*</span></label><input type="text" name="aadhaar" maxlength="12" pattern="\\d{12}" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,12)" placeholder="123456789012" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-black bg-slate-50 focus:bg-white outline-none"></div>
                     <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth <span class="text-red-500">*</span></label><input type="date" name="dob" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none"></div>
                     <div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">New 10-Digit Mobile Number <span class="text-red-500">*</span></label><input type="tel" name="new_mobile" maxlength="10" pattern="\\d{10}" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10)" placeholder="9999999999" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-black bg-slate-50 focus:bg-white outline-none"></div>`
        },
        ll_pdf: {
            title: 'Learning Licence PDF', subtitle: 'Application / LL Number से तुरंत Learning Licence PDF निकालें',
            serviceType: 'LL PDF', serviceKey: 'learning-license-pdf', cost: 30, icon: 'fa-file-pdf', color: 'rose',
            fields: `<div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Application / ID Number <span class="text-red-500">*</span></label><input type="text" name="id_number" placeholder="4655917725" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-black tracking-wider bg-slate-50 focus:bg-white outline-none"></div>`
        }
    };

    if (rtyuFormSpecs[serviceName]) {
        if (!window.canCurrentUserSeeService(serviceName)) { window.switchService('home'); return true; }
        const spec = rtyuFormSpecs[serviceName];
        const btnText = window.currentUserData?.hasFreeAccess ? `Submit (VIP Free)` : `Submit (${spec.cost} Credits)`;
        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid ${spec.icon} text-${spec.color}-600 mr-1.5"></i> ${spec.title}</h3>
                    <p class="text-[11px] font-bold text-slate-500">${spec.subtitle} • शुल्क: ${spec.cost} Credits (₹${spec.cost})</p>
                </div>
                <span class="bg-${spec.color}-100 text-${spec.color}-900 px-2.5 py-1 rounded-md text-[10px] font-black border border-${spec.color}-300 uppercase">${spec.cost} Credits (₹${spec.cost})</span>
            </div>
            <form onsubmit="window.submitRtyuService(event, { serviceKey: '${spec.serviceKey}', serviceType: '${spec.serviceType}', cost: ${spec.cost} })" class="max-w-xl mx-auto space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">${spec.fields}</div>
                <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base flex items-center justify-center gap-2">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> <span>${btnText}</span>
                </button>
                <div id="rtyuServiceResultBox" style="display: none;"></div>
            </form>
        `;
        return true;
    }

    // 0. MINOR SERVICE
    if (serviceName === 'domicile') {
        container.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-house-chimney text-royal-500 mr-1.5"></i> Domicile Certificate (मूल निवास)</h3>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('domicile')}
                <form onsubmit="window.submitForm(event, 'Domicile')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">District (जिला)</label>
                            <select id="districtSelect" name="DISTRICT" onchange="window.updateTehsilsAndThanas()" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                                <option value="BAGHPAT">बागपत</option>
                                <option value="SHAMLI">शामली</option>
                                <option value="MUZAFFARNAGAR">मुजफ्फरनगर</option>
                                <option value="MEERUT">मेरठ</option>
                                <option value="SAHARANPUR">सहारनपुर</option>
                                <option value="GHAZIABAD">गाजियाबाद</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tehsil (तहसील)</label>
                            <select id="tehsilSelect" name="TAHSEEL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Police Station (थाना)</label>
                            <select id="thanaSelect" name="THANA" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation (संबंध)</label>
                            <select name="REL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10">
                                <option value="पुत्र / पुत्री">पुत्र / पुत्री</option>
                                <option value="पत्नी      .">पत्नी</option>
                            </select>
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name (English)</label><input type="text" name="NAME" placeholder="Enter Full Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hindi Name (Optional)</label><input type="text" name="HNAME" placeholder="हिंदी में नाम (वैकल्पिक)" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father / Husband Name</label><input type="text" name="FNAME" placeholder="Enter Father/Husband Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" placeholder="Enter Mother Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">House Number (मकान नंबर - MN)</label><input type="text" name="MN" placeholder="Enter House No" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Area / Locality (मोहल्ला / पोस्ट)</label><input type="text" name="AREA" placeholder="Enter Area / Locality" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Village / Ward Name (गाँव / वार्ड)</label><input type="text" name="GRAM" placeholder="Enter Village / Ward Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">VLE Name (जन सेवा केंद्र संचालक)</label>${vleSelectHtml}</div>
                        <div><label class="block text-[11px] font-bold text-royal-700 uppercase mb-1">Issue Date (जारी करने की तारीख)</label><input type="date" name="ISSUE_DATE" value="${todayISO}" required class="w-full p-3 border border-royal-300 rounded-xl text-sm bg-royal-50/50 focus:bg-white outline-none relative z-10"></div>
                        <div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo</label><input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-royal-100 file:text-royal-700 cursor-pointer relative z-10"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.updateTehsilsAndThanas();
        return true;
    }

    // CASTE
    if (serviceName === 'caste') {
        container.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-users text-royal-500 mr-1.5"></i> Caste Certificate (जाति प्रमाण पत्र)</h3>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('caste')}
                <form onsubmit="window.submitForm(event, 'Caste')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">District (जिला)</label>
                            <select id="districtSelect" name="DISTRICT" onchange="window.updateTehsilsAndThanas()" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                                <option value="BAGHPAT">बागपत</option>
                                <option value="SHAMLI">शामली</option>
                                <option value="MUZAFFARNAGAR">मुजफ्फरनगर</option>
                                <option value="MEERUT">मेरठ</option>
                                <option value="SAHARANPUR">सहारनपुर</option>
                                <option value="GHAZIABAD">गाजियाबाद</option>
                            </select>
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tehsil (तहसील)</label><select id="tehsilSelect" name="TAHSEEL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="REL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10"><option value="पुत्र / पुत्री">पुत्र / पुत्री</option><option value="पत्नी      .">पत्नी</option></select></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Caste (जाति)</label>
                            <select name="CAST" onchange="window.toggleCustomInput(this, 'customCasteInput')" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                                ${window.CASTE_OPTIONS_LIST.map(c => `<option value="${c}">${c}</option>`).join('')}
                                <option value="OTHER">OTHER (अन्य जाति लिखें)</option>
                            </select>
                            <input type="text" id="customCasteInput" name="CAST_CUSTOM" placeholder="जाति का नाम यहाँ लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hindi Name (Optional)</label><input type="text" name="HNAME" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father/Husband Name</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Area / Locality</label><input type="text" name="AREA" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Village / Ward Name</label><input type="text" name="GRAM" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">VLE Name</label>${vleSelectHtml}</div>
                        <div><label class="block text-[11px] font-bold text-royal-700 uppercase mb-1">Issue Date (जारी करने की तारीख)</label><input type="date" name="ISSUE_DATE" value="${todayISO}" required class="w-full p-3 border border-royal-300 rounded-xl text-sm bg-royal-50/50 focus:bg-white outline-none relative z-10"></div>
                        <div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo</label><input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-royal-100 file:text-royal-700 cursor-pointer relative z-10"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.updateTehsilsAndThanas();
        return true;
    }

    // e-VOTER ID

    // PASSPORT SERVICES (Uses LOCAL_HTML_PASSPORT template!)
    if (serviceName === 'passport') {
        const passportBtnText = 'Generate Passport Document (FREE) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>';
        const defaultIssueDate = typeof window.generateRandomPassportIssueDate === 'function' ? window.generateRandomPassportIssueDate() : '2019-06-15';
        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-passport text-sky-500 mr-1.5"></i> Passport Services (पासपोर्ट सर्विस)</h3>
                    <p class="text-[11px] font-bold text-slate-500">पासपोर्ट डॉक्यूमेंट तुरंत जनरेट करें • शुल्क: FREE (निःशुल्क)</p>
                </div>
                <span class="bg-sky-100 text-sky-900 px-2.5 py-1 rounded-md text-[10px] font-black border border-sky-300 uppercase">FREE</span>
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('passport')}
                <form onsubmit="window.submitForm(event, 'Passport')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-sky-700 uppercase">Passport No. (पासपोर्ट नंबर)</label>
                                <button type="button" onclick="document.getElementById('inpPassportNo').value = window.generateRandomPassportNo();" class="text-[10px] bg-sky-100 hover:bg-sky-200 text-sky-900 font-black px-2 py-0.5 rounded border border-sky-300 transition"><i class="fa-solid fa-shuffle mr-1"></i>Auto</button>
                            </div>
                            <input type="text" id="inpPassportNo" name="PASSPORT_NO" placeholder="e.g. Z4681234" class="w-full p-3 border border-sky-300 rounded-xl text-sm font-black tracking-wider bg-sky-50/40 focus:bg-white outline-none uppercase relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name (पूरा नाम) <span class="text-red-500">*</span></label><input type="text" name="NAME" placeholder="Enter Full Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father / Husband Name <span class="text-red-500">*</span></label><input type="text" name="FNAME" placeholder="Enter Father/Husband Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sex / Gender</label><select name="SEX" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"><option value="MALE">MALE</option><option value="FEMALE">FEMALE</option></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth (DOB) <span class="text-red-500">*</span></label><input type="date" name="DOB" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10"></div>
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-sky-700 uppercase">Issue Date (जारी करने की तारीख) <span class="text-red-500">*</span></label>
                                <button type="button" onclick="document.getElementById('inpPassportIssueDate').value = window.generateRandomPassportIssueDate();" class="text-[10px] bg-sky-100 hover:bg-sky-200 text-sky-900 font-black px-2 py-0.5 rounded border border-sky-300 transition"><i class="fa-solid fa-shuffle mr-1"></i>Auto</button>
                            </div>
                            <input type="date" id="inpPassportIssueDate" name="ISSUE_DATE" value="${defaultIssueDate}" required class="w-full p-3 border border-sky-300 rounded-xl text-sm bg-sky-50 focus:bg-white outline-none relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Place of Issue (जारी स्थान)</label><input type="text" name="POI" value="GHAZIABAD" placeholder="e.g. GHAZIABAD" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Place of Birth / Address <span class="text-red-500">*</span></label><input type="text" name="ADDRESS" placeholder="e.g. BAGHPAT, UTTAR PRADESH" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div class="md:col-span-2">
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo (पासपोर्ट फोटो)</label>
                            <input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-sky-100 file:text-sky-700 cursor-pointer relative z-10">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">${passportBtnText}</button>
                </form>
            </div>
        `;
        if (!window.currentEditingAnnexure) {
            const pInp = document.getElementById('inpPassportNo');
            if (pInp && !pInp.value && typeof window.generateRandomPassportNo === 'function') pInp.value = window.generateRandomPassportNo();
        }
        return true;
    }

    // GAZETTE NOTIFICATION
    if (serviceName === 'gazette') {
        if (!window.currentUserData || !window.canCurrentUserSeeService('gazette')) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-newspaper text-purple-600 mr-1.5"></i> Gazette Notification (गैजेट नोटिफिकेशन • भारत का राजपत्र भाग IV)</h3>
                    <p class="text-[11px] font-bold text-slate-500">Old Name व New Name बोल्ड छपेंगे + 2 रैंडम इंडियन सेक्शन अपने-आप जुड़ेंगे • शुल्क: FREE (निःशुल्क)</p>
                </div>
                <span class="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-md text-[10px] font-black border border-purple-300 uppercase">FREE</span>
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('gazette')}
                <form onsubmit="window.submitForm(event, 'Gazette Notification')" class="space-y-3.5 relative z-10">
                    <input type="hidden" id="inpGazetteNo" name="GAZETTE_NO" value="CG-DL-W-2021-232514">
                    <input type="hidden" id="inpGazetteApplicantTypeHidden" name="APPLICANT_TYPE" value="ADULT">
                    <input type="hidden" id="inpGazetteChildRelHidden" name="CHILD_REL" value="son">

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label class="block text-[11px] font-bold text-purple-800 uppercase mb-1">Applicant Category (आवेदक का प्रकार) <span class="text-red-500">*</span></label>
                            <select name="CHANGE_TYPE" onchange="window.toggleGazetteChangeMode(this.value)" class="w-full p-3 border border-purple-300 rounded-xl text-sm font-black bg-purple-50/50 focus:bg-white outline-none relative z-10 cursor-pointer">
                                <option value="ADULT_SELF">1. ADULT / SELF (वयस्क — स्वयं का नाम परिवर्तन)</option>
                                <option value="MINOR_SON">2. MINOR SON (नाबालिग बेटे का नाम परिवर्तन — माता/पिता द्वारा)</option>
                                <option value="MINOR_DAUGHTER">3. MINOR DAUGHTER (नाबालिग बेटी का नाम परिवर्तन — माता/पिता द्वारा)</option>
                            </select>
                        </div>
                        <div id="gazetteChildAgeTopWrapper" style="display: none;">
                            <label class="block text-[11px] font-bold text-amber-900 uppercase mb-1">Age of Child in Years (बच्चे की उम्र) <span class="text-red-500">*</span></label>
                            <input type="number" id="inpGazetteChildAge" name="CHILD_AGE" placeholder="e.g. 6" min="1" max="17" class="w-full p-3 border border-amber-400 rounded-xl text-sm font-black bg-amber-50/60 focus:bg-white outline-none relative z-10">
                        </div>
                        <div id="gazetteMinorFields" style="display: none;" class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 bg-amber-50/80 border border-amber-300 rounded-2xl">
                            <div><label class="block text-[11px] font-bold text-amber-950 uppercase mb-1">Guardian / Parent Name (BOLD) <span class="text-red-500">*</span></label><input type="text" id="inpGazetteGuardian" name="GUARDIAN_NAME" placeholder="e.g. VISHAL SHUKLA" class="w-full p-2.5 border border-amber-300 rounded-xl text-sm font-bold bg-white outline-none uppercase"></div>
                            <div><label class="block text-[11px] font-bold text-amber-950 uppercase mb-1">Guardian's Father Name</label><input type="text" name="GUARDIAN_FATHER" placeholder="e.g. Late DAYA SHANKAR SHUKLA" class="w-full p-2.5 border border-amber-300 rounded-xl text-sm font-bold bg-white outline-none uppercase"></div>
                        </div>
                        <div><label id="lblGazetteOldName" class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Old Name (पुराना नाम / गलत नाम - BOLD) <span class="text-red-500">*</span></label><input type="text" name="OLD_NAME" placeholder="e.g. SUBRATA DAS" required class="w-full p-3 border border-slate-300 rounded-xl text-sm font-black bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label id="lblGazetteNewName" class="block text-[11px] font-bold text-emerald-700 uppercase mb-1">New Name (नया सही नाम - BOLD) <span class="text-red-500">*</span></label><input type="text" name="NEW_NAME" placeholder="e.g. DREYVAN DAYSE" required class="w-full p-3 border border-emerald-300 rounded-xl text-sm font-black bg-emerald-50/40 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Relation (संबंध) <span class="text-red-500">*</span></label>
                                <select id="selGazetteRelType" name="REL_TYPE" class="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none relative z-10 cursor-pointer">
                                    <option value="son of">son of (पुत्र)</option>
                                    <option value="daughter of">daughter of (पुत्री)</option>
                                    <option value="wife of">wife of (पत्नी)</option>
                                </select>
                            </div>
                            <div class="col-span-2"><label id="lblGazetteFatherName" class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Father / Husband Name (BOLD) <span class="text-red-500">*</span></label><input type="text" name="FNAME" placeholder="e.g. Late RADHA RAMAN DAS" required class="w-full p-3 border border-slate-300 rounded-xl text-sm font-black bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Occupation / Employment (पेशा — Optional)</label><input type="text" name="REASON" placeholder="e.g. Private Service / Business" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none relative z-10"></div>
                        <div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Complete Address <span class="text-red-500">*</span></label><input type="text" name="ADDRESS" placeholder="e.g. H.No. 43, Block-P, Sector-12, Noida, UP-201301" required class="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none relative z-10"></div>
                    </div>
                    <div class="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-[11px] font-bold text-purple-950 flex flex-wrap items-center justify-between gap-2">
                        <span><i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> Fixed Header: <strong>सं. 53] / No. 53] • 24-Jun-2021—26-Mar-2013 (Ashadh 3, 1943)</strong></span>
                        <span class="bg-purple-200 text-purple-950 px-2.5 py-0.5 rounded-full text-[10px] font-black">Part IV • Page (1235)</span>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">
                        Generate Gazette Notification (FREE) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>
                    </button>
                </form>
            </div>
        `;
        return true;
    }


    return false;
};
