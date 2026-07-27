// ================================================================
// NYSC ATTENDANCE SYSTEM - 800+ USERS VERSION
// Primary Storage: Google Sheets (Central Database)
// Backup Storage: localStorage (Temporary Cache)
// Nigeria Time (UTC+1) for all users
// On-Time vs Late Comers Separate Lists
// TIME FRAME: 6:30 AM - 9:00 AM ONLY
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // ================================================================
    // GOOGLE SHEETS CONFIGURATION
    // ================================================================
    const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxIzDWWOiNDmISXqGhPZtNpFW6GlqAvjWc232i0BXS43a5rmOXEzjgOzqSDFj_ZQ2qJ/exec';

    // ================================================================
    // TIME CONFIGURATION - NIGERIA TIME (UTC+1)
    // ================================================================
    const NIGERIA_TIMEZONE = 'Africa/Lagos';
    const CHECKIN_START_HOUR = 6;
    const CHECKIN_START_MINUTE = 30;  // 6:30 AM
    const CHECKIN_END_HOUR = 9;
    const CHECKIN_END_MINUTE = 0;     // 9:00 AM

    // ================================================================
    // Get Nigeria Time
    // ================================================================
    function getNigeriaTime() {
        const now = new Date();
        const nigeriaTime = new Date(now.toLocaleString('en-US', { timeZone: NIGERIA_TIMEZONE }));
        return nigeriaTime;
    }

    function getNigeriaTimeString() {
        const time = getNigeriaTime();
        return time.toLocaleTimeString('en-NG', { hour12: false });
    }

    function getNigeriaDateString() {
        const time = getNigeriaTime();
        return time.toLocaleDateString('en-NG', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    function getNigeriaDate() {
        const time = getNigeriaTime();
        return time.toDateString();
    }

    // ================================================================
    // TIME CHECK FUNCTIONS - FIXED
    // ================================================================
    
    // Check if current time is within allowed window (6:30 AM - 9:00 AM)
    function isWithinAllowedTime() {
        const now = getNigeriaTime();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTotalMinutes = (hours * 60) + minutes;
        const startTotalMinutes = (CHECKIN_START_HOUR * 60) + CHECKIN_START_MINUTE;
        const endTotalMinutes = (CHECKIN_END_HOUR * 60) + CHECKIN_END_MINUTE;
        
        return currentTotalMinutes >= startTotalMinutes && 
               currentTotalMinutes <= endTotalMinutes;
    }

    // Check if current time is before 6:30 AM
    function isBeforeStartTime() {
        const now = getNigeriaTime();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTotalMinutes = (hours * 60) + minutes;
        const startTotalMinutes = (CHECKIN_START_HOUR * 60) + CHECKIN_START_MINUTE;
        
        return currentTotalMinutes < startTotalMinutes;
    }

    // Check if current time is after 9:00 AM (LATE)
    function isAfterEndTime() {
        const now = getNigeriaTime();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTotalMinutes = (hours * 60) + minutes;
        const endTotalMinutes = (CHECKIN_END_HOUR * 60) + CHECKIN_END_MINUTE;
        
        return currentTotalMinutes > endTotalMinutes;
    }

    // Check if user is late (after 9:00 AM)
    function isUserLate() {
        return isAfterEndTime();
    }

    // Get minutes late (how many minutes after 9:00 AM)
    function getLateMinutes() {
        if (!isUserLate()) return 0;
        const now = getNigeriaTime();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTotalMinutes = (hours * 60) + minutes;
        const endTotalMinutes = (CHECKIN_END_HOUR * 60) + CHECKIN_END_MINUTE;
        return currentTotalMinutes - endTotalMinutes;
    }

    // Get minutes until check-in opens (for countdown)
    function getMinutesUntilStart() {
        const now = getNigeriaTime();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTotalMinutes = (hours * 60) + minutes;
        const startTotalMinutes = (CHECKIN_START_HOUR * 60) + CHECKIN_START_MINUTE;
        return startTotalMinutes - currentTotalMinutes;
    }

    // ================================================================
    // ADMIN CONFIGURATION
    // ================================================================
    const ADMIN_STATE_CODES = [
        'LA/25A/0001',
    ];

    // ================================================================
    // DOM ELEMENTS
    // ================================================================
    const loginSection = document.getElementById('loginSection');
    const attendanceSection = document.getElementById('attendanceSection');
    const adminSection = document.getElementById('adminSection');
    const loginForm = document.getElementById('loginForm');
    const fullNameInput = document.getElementById('fullName');
    const stateCodeInput = document.getElementById('stateCode');
    const codeHint = document.getElementById('codeHint');
    const cdsGroupSelect = document.getElementById('cdsGroup');
    const loginBtn = document.getElementById('loginBtn');
    const displayStateCode = document.getElementById('displayStateCode');
    const userName = document.getElementById('userName');
    const userState = document.getElementById('userState');
    const logoutBtn = document.getElementById('logoutBtn');
    const markAttendanceBtn = document.getElementById('markAttendanceBtn');
    const currentTimeEl = document.getElementById('currentTime');
    const currentDateEl = document.getElementById('currentDate');
    const lgName = document.getElementById('lgName');
    const locationStatus = document.getElementById('locationStatus');
    const attendanceMessage = document.getElementById('attendanceMessage');
    const historyList = document.getElementById('historyList');
    const recordCount = document.getElementById('recordCount');
    const totalDays = document.getElementById('totalDays');
    const totalHours = document.getElementById('totalHours');

    const totalCheckinsEl = document.getElementById('totalCheckins');
    const totalCompletedEl = document.getElementById('totalCompleted');
    const totalActiveEl = document.getElementById('totalActive');
    const totalDaysEl = document.getElementById('totalDays');

    // ================================================================
    // CREATE TIME WINDOW DISPLAY
    // ================================================================
    const timeWindowDisplay = document.createElement('div');
    timeWindowDisplay.id = 'timeWindowDisplay';
    timeWindowDisplay.style.cssText = `
        text-align: center;
        padding: 8px 12px;
        margin: 0 0 12px 0;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 10px;
        font-size: 13px;
        color: #2c3e50;
        border: 1px solid #e9ecef;
    `;
    timeWindowDisplay.innerHTML = `
        ⏰ Check-in Hours: <strong>6:30 AM - 9:00 AM</strong> (Nigeria Time)
    `;

    const attendanceCard = document.querySelector('.attendance-card');
    if (attendanceCard) {
        attendanceCard.insertBefore(timeWindowDisplay, attendanceCard.firstChild);
    }

    // ================================================================
    // CHECK IF USER IS ADMIN
    // ================================================================
    function isAdminUser(stateCode) {
        return ADMIN_STATE_CODES.includes(stateCode);
    }

    // ================================================================
    // USER NUMBER DISPLAY
    // ================================================================
    const userNumberDisplay = document.createElement('div');
    userNumberDisplay.id = 'userNumberDisplay';
    userNumberDisplay.style.cssText = `
        text-align: center;
        padding: 10px;
        margin: 10px 0 0 0;
        background: linear-gradient(135deg, #eef2ff 0%, #d6e4ff 100%);
        border-radius: 12px;
        border: 2px solid #667eea;
        display: none;
    `;
    userNumberDisplay.innerHTML = `
        <span style="font-size: 14px; color: #2c3e50;">👤 Your Attendance Number</span><br>
        <span id="userNumberValue" style="font-size: 36px; font-weight: 800; color: #667eea;">--</span>
    `;

    if (attendanceCard) {
        attendanceCard.appendChild(userNumberDisplay);
    }

    // ================================================================
    // ALLOWED ADDRESSES
    // ================================================================
    const ALLOWED_ADDRESSES = [
        {
            id: 1,
            fullAddress: "27 Baale Street, Igbo-Efon, Eti-Osa Local Government Area, Lagos State, Nigeria",
            street: "27 Baale Street",
            area: "Igbo-Efon",
            lga: "Eti-Osa",
            state: "Lagos",
            country: "Nigeria",
            coordinates: {
                lat: 6.4489,
                lng: 3.5050
            },
            allowedRadiusMeters: 50
        },
        {
            id: 2,
            fullAddress: "George Adiele Crescent, Lagos State, Nigeria",
            street: "George Adiele Crescent",
            area: "Lekki",
            lga: "Eti-Osa",
            state: "Lagos",
            country: "Nigeria",
            coordinates: {
                lat: 6.457801,
                lng: 3.574184
            },
            allowedRadiusMeters: 50
        }
    ];

    // ================================================================
    // STATE CODES
    // ================================================================
    const STATE_CODES = {
        'LA': { name: 'Lagos', fullName: 'Lagos State', capital: 'Ikeja' },
        'AB': { name: 'Abuja', fullName: 'Federal Capital Territory', capital: 'Abuja' },
        'KN': { name: 'Kano', fullName: 'Kano State', capital: 'Kano' },
        'PH': { name: 'Rivers', fullName: 'Rivers State', capital: 'Port Harcourt' },
        'IB': { name: 'Oyo', fullName: 'Oyo State', capital: 'Ibadan' },
        'EN': { name: 'Enugu', fullName: 'Enugu State', capital: 'Enugu' },
        'KD': { name: 'Kaduna', fullName: 'Kaduna State', capital: 'Kaduna' },
        'BE': { name: 'Edo', fullName: 'Edo State', capital: 'Benin City' },
        'OG': { name: 'Ogun', fullName: 'Ogun State', capital: 'Abeokuta' },
        'OY': { name: 'Oyo', fullName: 'Oyo State', capital: 'Ibadan' },
        'PL': { name: 'Plateau', fullName: 'Plateau State', capital: 'Jos' },
        'BO': { name: 'Borno', fullName: 'Borno State', capital: 'Maiduguri' },
        'RI': { name: 'Rivers', fullName: 'Rivers State', capital: 'Port Harcourt' },
        'AK': { name: 'Akwa Ibom', fullName: 'Akwa Ibom State', capital: 'Uyo' },
        'CR': { name: 'Cross River', fullName: 'Cross River State', capital: 'Calabar' }
    };

    // ================================================================
    // APPLICATION STATE
    // ================================================================
    let currentUser = null;
    let userLocation = null;
    let isCheckedIn = false;
    let attendanceTimer = null;
    let locationWatchId = null;
    let currentState = null;
    let isAtAllowedAddress = false;
    let currentAddressMatch = null;
    let distanceToAddresses = [];
    let hasCheckedInToday = false;
    let allRecords = [];
    let isProcessing = false;
    let dataLoaded = false;

    // ================================================================
    // SESSION MANAGEMENT
    // ================================================================
    function clearStaleSession() {
        const sessionUser = localStorage.getItem('currentUser');
        if (sessionUser) {
            try {
                const user = JSON.parse(sessionUser);
                const loginTime = new Date(user.loginTime);
                const now = new Date();
                const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
                if (hoursDiff > 24) {
                    localStorage.removeItem('currentUser');
                    return true;
                }
                return false;
            } catch (e) {
                localStorage.removeItem('currentUser');
                return true;
            }
        }
        return false;
    }

    clearStaleSession();

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            currentState = currentUser.stateCode.substring(0, 2);
            showAttendanceSection();
        } catch (e) {
            localStorage.removeItem('currentUser');
            currentUser = null;
        }
    }

    // ================================================================
    // LOGIN VALIDATION FUNCTIONS
    // ================================================================
    function isStateCodeTakenByDifferentName(stateCode, fullName) {
        const records = getAllAttendance();
        const existingRecords = records.filter(r => r.stateCode === stateCode);
        if (existingRecords.length === 0) return false;
        const hasDifferentName = existingRecords.some(r => {
            const existingName = r.corperName || '';
            return existingName.toLowerCase() !== fullName.toLowerCase();
        });
        return hasDifferentName;
    }

    function isValidFullName(name) {
        const trimmed = name.trim();
        const parts = trimmed.split(/\s+/);
        return parts.length >= 2 && trimmed.length > 3;
    }

    // ================================================================
    // FORM VALIDATION
    // ================================================================
    function validateAllFields() {
        const fullName = fullNameInput.value.trim();
        const stateCode = stateCodeInput.value.trim();
        const cdsGroup = cdsGroupSelect.value;
        const stateCodePattern = /^LA\/\d{2}[A-Z]\/\d{4}$/;
        const isStateValid = stateCodePattern.test(stateCode);
        const isNameValid = isValidFullName(fullName);
        loginBtn.disabled = !(isNameValid && isStateValid && cdsGroup);
        return loginBtn.disabled === false;
    }

    fullNameInput.addEventListener('input', function() {
        const value = this.value.trim();
        if (isValidFullName(value)) {
            this.style.borderColor = '#2ecc71';
        } else if (value.length > 0) {
            this.style.borderColor = '#e74c3c';
        } else {
            this.style.borderColor = '#e0e0e0';
        }
        validateAllFields();
    });

    stateCodeInput.addEventListener('input', function(e) {
        const value = this.value.toUpperCase().trim();
        this.value = value;
        const stateCodePattern = /^([A-Z]{2})\/(\d{2}[A-Z])\/(\d{4})$/;
        const match = value.match(stateCodePattern);
        if (value.length === 0) {
            codeHint.textContent = 'Enter your NYSC state code (Must be Lagos State - LA)';
            codeHint.className = 'hint';
            loginBtn.disabled = true;
            return;
        }
        if (match) {
            const statePrefix = match[1];
            if (statePrefix === 'LA') {
                codeHint.textContent = '✅ Valid Lagos State code!';
                codeHint.className = 'hint valid';
                this.style.borderColor = '#2ecc71';
            } else {
                codeHint.textContent = '❌ Only Lagos State (LA) codes are allowed';
                codeHint.className = 'hint invalid';
                this.style.borderColor = '#e74c3c';
                loginBtn.disabled = true;
                return;
            }
        } else if (value.length < 2) {
            codeHint.textContent = 'Enter at least 2 characters (LA for Lagos State)';
            codeHint.className = 'hint';
            this.style.borderColor = '#e0e0e0';
            loginBtn.disabled = true;
            return;
        } else {
            codeHint.textContent = 'Format: LA/99X/9999 (e.g., LA/23A/1234)';
            codeHint.className = 'hint invalid';
            this.style.borderColor = '#e74c3c';
            loginBtn.disabled = true;
            return;
        }
        validateAllFields();
    });

    cdsGroupSelect.addEventListener('change', function() {
        const fullName = fullNameInput.value.trim();
        const stateCode = stateCodeInput.value.trim();
        const selectedCDS = this.value;
        this.style.borderColor = this.value ? '#2ecc71' : '#e0e0e0';
        if (fullName && stateCode && selectedCDS) {
            const existingCDS = getUserExistingCDSGroup(fullName, stateCode);
            const hint = document.querySelector('.form-group:last-of-type .hint');
            if (hint) {
                if (existingCDS && existingCDS !== selectedCDS) {
                    hint.textContent = `⚠️ You already have a CDS Group: "${existingCDS}". Please select "${existingCDS}" to continue.`;
                    hint.className = 'hint invalid';
                    hint.style.color = '#e74c3c';
                    loginBtn.disabled = true;
                } else if (existingCDS && existingCDS === selectedCDS) {
                    hint.textContent = `✅ Your CDS Group "${selectedCDS}" matches your records.`;
                    hint.className = 'hint valid';
                    hint.style.color = '#27ae60';
                } else {
                    hint.textContent = 'Select your Community Development Service group';
                    hint.className = 'hint';
                    hint.style.color = '#95a5a6';
                }
            }
        }
        validateAllFields();
    });

    function getUserExistingCDSGroup(fullName, stateCode) {
        const records = getAllAttendance();
        const userRecords = records.filter(r => 
            r.corperName && r.corperName.toLowerCase() === fullName.toLowerCase() &&
            r.stateCode === stateCode
        );
        const cdsGroups = new Set();
        userRecords.forEach(record => {
            if (record.cdsGroup) cdsGroups.add(record.cdsGroup);
        });
        if (cdsGroups.size === 1) return Array.from(cdsGroups)[0];
        return null;
    }

    // ================================================================
    // LOGIN HANDLER
    // ================================================================
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const fullName = fullNameInput.value.trim();
        const stateCode = stateCodeInput.value.toUpperCase().trim();
        const statePrefix = stateCode.substring(0, 2);
        const cdsGroup = cdsGroupSelect.value;

        if (!fullName) { showLoginMessage('❌ Please enter your full name', 'error'); return; }
        if (!isValidFullName(fullName)) { showLoginMessage('❌ Please enter both your first name and last name', 'error'); return; }
        if (statePrefix !== 'LA') { showLoginMessage('❌ Only Lagos State (LA) codes are allowed!', 'error'); return; }
        if (!STATE_CODES[statePrefix]) { showLoginMessage('Invalid state code! Please check your code.', 'error'); return; }

        const stateCodeConflict = isStateCodeTakenByDifferentName(stateCode, fullName);
        if (stateCodeConflict) {
            showLoginMessage(
                `❌ STATE CODE ALREADY REGISTERED!\n\nState Code: "${stateCode}"\nThis state code is already registered to a different person.\n\n⚠️ Each state code can only belong to ONE person.`,
                'error'
            );
            stateCodeInput.style.borderColor = '#e74c3c';
            stateCodeInput.style.boxShadow = '0 0 0 4px rgba(231, 76, 60, 0.2)';
            return;
        }

        if (!cdsGroup) { showLoginMessage('❌ Please select your CDS group', 'error'); return; }

        const existingCDS = getUserExistingCDSGroup(fullName, stateCode);
        if (existingCDS && existingCDS !== cdsGroup) {
            showLoginMessage(
                `❌ CDS GROUP CONFLICT!\n\nYou already have a CDS Group: "${existingCDS}"\nYou tried to select: "${cdsGroup}"\n\n⚠️ You can only belong to ONE CDS group.`,
                'error'
            );
            cdsGroupSelect.style.borderColor = '#e74c3c';
            cdsGroupSelect.style.boxShadow = '0 0 0 4px rgba(231, 76, 60, 0.2)';
            return;
        }

        if (locationWatchId) { navigator.geolocation.clearWatch(locationWatchId); locationWatchId = null; }
        if (attendanceTimer) { clearInterval(attendanceTimer); attendanceTimer = null; }

        isCheckedIn = false;
        isAtAllowedAddress = false;
        currentAddressMatch = null;
        userLocation = null;
        hasCheckedInToday = false;

        currentState = statePrefix;
        const stateInfo = STATE_CODES[statePrefix];

        currentUser = {
            id: stateCode,
            stateCode: stateCode,
            stateName: stateInfo.fullName,
            statePrefix: statePrefix,
            fullName: fullName,
            name: fullName,
            cdsGroup: cdsGroup,
            loginTime: new Date().toISOString(),
            allowedAddresses: ALLOWED_ADDRESSES.map(a => a.fullAddress),
            userId: Date.now(),
            isAdmin: isAdminUser(stateCode)
        };

        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showAttendanceSection();
        startAttendanceTracking();

        let addressList = ALLOWED_ADDRESSES.map((a, i) => `${i+1}. ${a.fullAddress}`).join('\n');
        let welcomeMessage = `✅ Welcome ${currentUser.fullName}!\n📚 CDS Group: ${cdsGroup}\n📍 State: ${stateInfo.fullName}\n\nPlease go to one of these locations:\n${addressList}`;
        if (existingCDS) {
            welcomeMessage = `✅ Welcome back ${currentUser.fullName}!\n📚 CDS Group: ${cdsGroup} (Verified)\n📍 State: ${stateInfo.fullName}\n\nPlease go to one of these locations:\n${addressList}`;
        }
        if (currentUser.isAdmin) {
            welcomeMessage += '\n\n👑 You have ADMIN access to the dashboard.';
        }
        showLoginMessage(welcomeMessage, 'success');

        fullNameInput.value = '';
        stateCodeInput.value = '';
        cdsGroupSelect.value = '';
        loginBtn.disabled = true;
        codeHint.textContent = 'Enter your NYSC state code (Must be Lagos State - LA)';
        codeHint.className = 'hint';
        fullNameInput.style.borderColor = '#e0e0e0';
        stateCodeInput.style.borderColor = '#e0e0e0';
        cdsGroupSelect.style.borderColor = '#e0e0e0';
        cdsGroupSelect.style.boxShadow = 'none';
    });

    // ================================================================
    // LOGOUT HANDLER
    // ================================================================
    logoutBtn.addEventListener('click', function() {
        if (confirm(`Are you sure you want to logout ${currentUser ? currentUser.fullName : ''}?`)) {
            localStorage.removeItem('currentUser');
            if (locationWatchId) { navigator.geolocation.clearWatch(locationWatchId); locationWatchId = null; }
            if (attendanceTimer) { clearInterval(attendanceTimer); attendanceTimer = null; }
            currentUser = null;
            isCheckedIn = false;
            isAtAllowedAddress = false;
            currentAddressMatch = null;
            userLocation = null;
            hasCheckedInToday = false;
            loginSection.style.display = 'block';
            attendanceSection.style.display = 'none';
            adminSection.style.display = 'none';
            resetUI();
            stateCodeInput.value = '';
            fullNameInput.value = '';
            cdsGroupSelect.value = '';
            codeHint.textContent = 'Enter your NYSC state code (Must be Lagos State - LA)';
            codeHint.className = 'hint';
            loginBtn.disabled = true;
            userNumberDisplay.style.display = 'none';
        }
    });

    // ================================================================
    // LOCATION FUNCTIONS
    // ================================================================
    function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function checkAllowedAddresses(lat, lng) {
        const results = ALLOWED_ADDRESSES.map(address => {
            const distance = calculateDistanceInMeters(lat, lng, address.coordinates.lat, address.coordinates.lng);
            return { address: address, distance: distance, isWithinRadius: distance <= address.allowedRadiusMeters };
        });
        distanceToAddresses = results;
        const closest = results.reduce((min, current) => current.distance < min.distance ? current : min);
        const matched = results.find(r => r.isWithinRadius);
        if (matched) {
            isAtAllowedAddress = true;
            currentAddressMatch = matched.address;
            return matched;
        } else {
            isAtAllowedAddress = false;
            currentAddressMatch = null;
            return closest;
        }
    }

    // ================================================================
    // ATTENDANCE CHECK FUNCTIONS
    // ================================================================
    function hasUserCheckedInToday() {
        if (!currentUser) return false;
        const today = getNigeriaDate();
        const records = getAllAttendance();
        const userRecords = records.filter(r => r.corperId === currentUser.id);
        const todayRecords = userRecords.filter(r => r.fullDate === today);
        return todayRecords.length > 0;
    }

    function isCurrentlyCheckedIn() {
        if (!currentUser) return false;
        const today = getNigeriaDate();
        const records = getAllAttendance();
        const userRecords = records.filter(r => r.corperId === currentUser.id);
        const todayRecords = userRecords.filter(r => r.fullDate === today);
        if (todayRecords.length === 0) return false;
        const lastRecord = todayRecords[todayRecords.length - 1];
        return !lastRecord.checkOutTime;
    }

    // ================================================================
    // DATA MANAGEMENT - PRIMARY: Google Sheets
    // ================================================================

    function getAllAttendance() {
        return allRecords.length > 0 ? allRecords : [];
    }

    function saveAttendance(records) {
        allRecords = records;
        localStorage.setItem('attendanceHistory', JSON.stringify(records));
    }

    function updateLocalBackup(record) {
        let records = getAllAttendance();
        const index = records.findIndex(r => r.id === record.id);
        if (index !== -1) {
            records[index] = { ...records[index], ...record };
        } else {
            records.push(record);
        }
        allRecords = records;
        localStorage.setItem('attendanceHistory', JSON.stringify(records));
    }

    function getTodayAttendance() {
        const today = getNigeriaDate();
        const records = getAllAttendance();
        return records.filter(record => record.fullDate === today);
    }

    function updateAttendance(id, updates) {
        const records = getAllAttendance();
        const index = records.findIndex(record => record.id === id);
        if (index !== -1) {
            records[index] = { ...records[index], ...updates };
        }
        saveAttendance(records);
        return records;
    }

    // ================================================================
    // LOAD FROM GOOGLE SHEETS
    // ================================================================
    async function loadAllRecordsFromSheet() {
        try {
            const response = await fetch(GOOGLE_SHEETS_URL + '?action=getAll', { 
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.records) {
                    const formattedRecords = result.records.map((record, index) => ({
                        id: Date.now() + index,
                        corperId: record['State Code'] || '',
                        stateCode: record['State Code'] || '',
                        stateName: 'Lagos State',
                        corperName: record['Name'] || '',
                        cdsGroup: record['CDS group'] || '',
                        address: record['Address'] || '',
                        street: record['Street'] || '',
                        area: record['Area'] || '',
                        lga: record['LGA'] || '',
                        checkInTime: record['Check In'] || '',
                        checkInTimestamp: record['Check In'] ? new Date().toISOString() : '',
                        checkOutTime: record['Check Out'] || '',
                        checkOutTimestamp: record['Check Out'] ? new Date().toISOString() : '',
                        status: record['Status'] || 'Active',
                        lateMinutes: parseInt(record['Late Minutes']) || 0,
                        date: record['Date'] || '',
                        fullDate: record['Date'] || getNigeriaDate(),
                        verifiedAddress: record['Verified Address'] || '',
                        verifiedBy: 'GPS Location',
                        accuracy: record['Accuracy'] || '',
                        latitude: record['Latitude'] || '',
                        longitude: record['Longitude'] || '',
                        userId: record['User ID'] || '',
                        attendanceNumber: index + 2
                    }));
                    
                    saveAttendance(formattedRecords);
                    dataLoaded = true;
                    console.log('✅ Loaded from Google Sheets:', formattedRecords.length, 'records');
                    return formattedRecords;
                }
            }
            
            const localData = JSON.parse(localStorage.getItem('attendanceHistory') || '[]');
            allRecords = localData;
            dataLoaded = true;
            console.log('📦 Using localStorage fallback:', localData.length, 'records');
            return localData;
            
        } catch (error) {
            console.error('❌ Error loading from Google Sheets:', error);
            const localData = JSON.parse(localStorage.getItem('attendanceHistory') || '[]');
            allRecords = localData;
            dataLoaded = true;
            return localData;
        }
    }

    // ================================================================
    // SAVE TO GOOGLE SHEETS
    // ================================================================
    async function syncToGoogleSheets(record, action = 'checkin') {
        try {
            if (!navigator.onLine) {
                console.warn('📡 Offline - Data saved locally only');
                updateLocalBackup(record);
                return { success: false };
            }

            const data = {
                name: record.corperName || '',
                stateCode: record.stateCode || '',
                date: record.date || record.fullDate || '',
                checkInTime: record.checkInTime || '',
                checkOutTime: record.checkOutTime || '',
                cdsGroup: record.cdsGroup || '',
                status: record.status || 'Active',
                duration: record.duration || '',
                lateMinutes: record.lateMinutes || 0,
                action: action,
                attendanceNumber: record.attendanceNumber || 0
            };

            await fetch(GOOGLE_SHEETS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            updateLocalBackup(record);
            console.log('✅ Synced to Google Sheets');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            updateLocalBackup(record);
            return { success: false };
        }
    }

    // ================================================================
    // DELETE RECORD FROM GOOGLE SHEETS
    // ================================================================
    async function deleteRecordFromSheet(recordId) {
        try {
            const allRecords = getAllAttendance();
            const updatedRecords = allRecords.filter(r => r.id != recordId);
            saveAttendance(updatedRecords);
            await clearGoogleSheets();
            
            for (const record of updatedRecords) {
                await syncToGoogleSheets(record, 'checkin');
            }
            
            console.log('✅ Record deleted from Google Sheets');
            return true;
            
        } catch (error) {
            console.error('❌ Error deleting record:', error);
            return false;
        }
    }

    // ================================================================
    // CLEAR GOOGLE SHEETS
    // ================================================================
    async function clearGoogleSheets() {
        try {
            const response = await fetch(GOOGLE_SHEETS_URL + '?action=clearAll', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            let result = { success: false };
            try {
                result = await response.json();
            } catch (e) {
                result = { success: true };
            }
            
            console.log('✅ Google Sheets cleared:', result);
            return true;
        } catch (error) {
            console.error('❌ Error clearing Google Sheets:', error);
            return false;
        }
    }

    // ================================================================
    // GET NEXT ATTENDANCE NUMBER
    // ================================================================
    function getNextAttendanceNumber() {
        const today = getNigeriaDate();
        const todayRecords = getAllAttendance().filter(record =>
            record.fullDate === today
        );

        if (todayRecords.length === 0) {
            return 2;
        }

        const highestNumber = Math.max(
            ...todayRecords.map(record => record.attendanceNumber || 0)
        );

        return highestNumber + 1;
    }

    // ================================================================
    // GET USER'S ATTENDANCE NUMBER
    // ================================================================
    function getUserAttendanceNumber() {
        if (!currentUser) return '--';
        
        const today = getNigeriaDate();
        const records = getAllAttendance();
        
        const todayRecord = records.find(record =>
            record.corperId === currentUser.id &&
            record.fullDate === today
        );

        if (todayRecord && todayRecord.attendanceNumber) {
            return todayRecord.attendanceNumber;
        }

        return '--';
    }

    // ================================================================
    // UPDATE USER NUMBER DISPLAY
    // ================================================================
    function updateUserNumberDisplay() {
        if (adminSection.style.display === 'block') {
            userNumberDisplay.style.display = 'none';
            return;
        }
        
        if (!currentUser) {
            userNumberDisplay.style.display = 'none';
            return;
        }
        
        const number = getUserAttendanceNumber();
        const numberDisplay = document.getElementById('userNumberValue');
        if (numberDisplay) {
            numberDisplay.textContent = number;
        }
        userNumberDisplay.style.display = 'block';
    }

    // ================================================================
    // MARK ATTENDANCE BUTTON - WITH COMPLETE TIME FRAME CHECK
    // ================================================================
    markAttendanceBtn.addEventListener('click', function() {
        if (adminSection.style.display === 'block') {
            showMessage('⛔ Please close the Admin Dashboard to mark attendance.', 'error');
            return;
        }
        
        if (isProcessing) {
            showMessage('⏳ Please wait, processing your request...', 'info');
            return;
        }
        
        if (!currentUser) {
            showMessage('Please login first', 'error');
            return;
        }

        if (!userLocation) {
            showMessage('Please wait for location to be detected', 'error');
            return;
        }

        if (!isAtAllowedAddress) {
            const closest = distanceToAddresses.reduce((min, current) => current.distance < min.distance ? current : min);
            const distance = Math.round(closest.distance);
            showMessage(`❌ You are ${distance} meters away from the allowed location.`, 'error');
            return;
        }

        isProcessing = true;

        const nigeriaNow = getNigeriaTime();
        const today = getNigeriaDate();
        const timeStr = getNigeriaTimeString();
        const dateStr = getNigeriaDateString();

        // ================================================================
        // TIME FRAME CHECK - FIXED
        // ================================================================
        
        // Check 1: Is it before 6:30 AM?
        if (isBeforeStartTime()) {
            const minutesUntil = getMinutesUntilStart();
            const hoursUntil = Math.floor(minutesUntil / 60);
            const minsUntil = minutesUntil % 60;
            
            let timeMsg = '';
            if (hoursUntil > 0) {
                timeMsg = `${hoursUntil} hour${hoursUntil > 1 ? 's' : ''} and ${minsUntil} minute${minsUntil > 1 ? 's' : ''}`;
            } else {
                timeMsg = `${minsUntil} minute${minsUntil > 1 ? 's' : ''}`;
            }
            
            showMessage(
                `⏰ CHECK-IN NOT OPEN YET\n\n` +
                `📅 ${dateStr}\n` +
                `⏰ Current time: ${timeStr}\n` +
                `⏰ Check-in opens at: 6:30 AM\n\n` +
                `⏳ Check-in opens in: ${timeMsg}\n\n` +
                `Please come back at 6:30 AM to check in.`,
                'error'
            );
            isProcessing = false;
            return;
        }

        // Check 2: Is it after 9:00 AM? (LATE)
        if (isAfterEndTime()) {
            const lateMinutes = getLateMinutes();
            // Show warning but allow check-in with LATE status
            // We'll handle this after checking if already checked in today
        }

        // ================================================================
        // CHECK IF ALREADY CHECKED IN TODAY
        // ================================================================
        loadAllRecordsFromSheet().then(() => {
            const allRecords = getAllAttendance();
            const userRecords = allRecords.filter(r => r.corperId === currentUser.id);
            const todayRecords = userRecords.filter(r => r.fullDate === today);

            if (todayRecords.length > 0) {
                const lastRecord = todayRecords[todayRecords.length - 1];
                
                if (!lastRecord.checkOutTime) {
                    // CHECK OUT
                    const duration = calculateDuration(lastRecord.checkInTimestamp, nigeriaNow);
                    const updatedRecords = updateAttendance(lastRecord.id, {
                        checkOutTime: timeStr,
                        checkOutTimestamp: nigeriaNow.toISOString(),
                        duration: duration,
                        status: 'Completed'
                    });
                    
                    syncToGoogleSheets(lastRecord, 'checkout');
                    
                    showMessage(`✅ CHECKED OUT at ${timeStr}\n📅 ${dateStr}\n⏱️ Duration: ${duration}`, 'success');
                    
                    isCheckedIn = false;
                    hasCheckedInToday = true;
                    markAttendanceBtn.innerHTML = '🚫 Check In Unavailable';
                    markAttendanceBtn.className = 'btn-attendance disabled';
                    markAttendanceBtn.disabled = true;
                    markAttendanceBtn.style.opacity = '0.6';
                    markAttendanceBtn.style.cursor = 'not-allowed';
                    userNumberDisplay.style.display = 'none';
                    
                    updateHistory();
                    updateStats();
                    updateStatsCards(allRecords.filter(r => r.corperId === currentUser.id));
                    isProcessing = false;
                    return;
                } else {
                    const checkInTime = lastRecord.checkInTime;
                    const checkOutTime = lastRecord.checkOutTime;
                    const duration = lastRecord.duration || 'N/A';
                    showMessage(
                        `❌ YOU HAVE ALREADY CHECKED IN TODAY\n\n` +
                        `📅 ${dateStr}\n` +
                        `⏰ Check In: ${checkInTime}\n` +
                        `⏰ Check Out: ${checkOutTime}\n` +
                        `⏱️ Duration: ${duration}\n\n` +
                        `⚠️ Check-in is only allowed ONCE per day.\n` +
                        `Please come back tomorrow.`,
                        'error'
                    );
                    markAttendanceBtn.disabled = true;
                    markAttendanceBtn.innerHTML = '🚫 Already Checked In Today';
                    markAttendanceBtn.className = 'btn-attendance disabled';
                    markAttendanceBtn.style.opacity = '0.6';
                    markAttendanceBtn.style.cursor = 'not-allowed';
                    isProcessing = false;
                    return;
                }
            }

            // ================================================================
            // NEW CHECK-IN - CHECK FOR LATE (After 9:00 AM)
            // ================================================================
            const isLate = isAfterEndTime();
            const lateMinutes = isLate ? getLateMinutes() : 0;
            const status = isLate ? 'Late' : 'On Time';
            
            const attendanceNumber = getNextAttendanceNumber();
            
            const record = {
                id: Date.now(),
                corperId: currentUser.id,
                stateCode: currentUser.stateCode,
                stateName: currentUser.stateName,
                corperName: currentUser.fullName || currentUser.name,
                cdsGroup: currentUser.cdsGroup,
                address: currentAddressMatch.fullAddress,
                street: currentAddressMatch.street,
                area: currentAddressMatch.area,
                lga: currentAddressMatch.lga,
                addressId: currentAddressMatch.id,
                checkInTime: timeStr,
                checkInTimestamp: nigeriaNow.toISOString(),
                checkOutTime: null,
                checkOutTimestamp: null,
                duration: null,
                date: dateStr,
                fullDate: today,
                verifiedAddress: currentAddressMatch.fullAddress,
                verifiedBy: 'GPS Location',
                accuracy: userLocation.accuracy ? `${Math.round(userLocation.accuracy)}m` : 'Unknown',
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                userId: currentUser.userId || currentUser.id,
                attendanceNumber: attendanceNumber,
                status: status,
                lateMinutes: lateMinutes
            };

            const updatedHistory = [...getAllAttendance(), record];
            saveAttendance(updatedHistory);
            
            syncToGoogleSheets(record, 'checkin');
            
            // ================================================================
            // SHOW APPROPRIATE MESSAGE BASED ON TIMING
            // ================================================================
            if (isLate) {
                showMessage(
                    `⚠️ CHECKED IN - LATE!\n` +
                    `📅 ${dateStr}\n` +
                    `⏰ You arrived at: ${timeStr}\n` +
                    `⏰ Expected time: 9:00 AM\n` +
                    `⏱️ Minutes late: ${lateMinutes}\n\n` +
                    `👤 Your Attendance Number: ${attendanceNumber}\n\n` +
                    `⚠️ This has been recorded as a LATE arrival.`,
                    'error'
                );
            } else {
                showMessage(
                    `✅ CHECKED IN at ${timeStr}\n` +
                    `📅 ${dateStr}\n\n` +
                    `👤 Your Attendance Number: ${attendanceNumber}\n` +
                    `✅ Status: On Time\n\n` +
                    `⚠️ Remember: You can only check in ONCE per day.`,
                    'success'
                );
            }
            
            updateUserNumberDisplay();
            
            isCheckedIn = true;
            hasCheckedInToday = true;
            markAttendanceBtn.innerHTML = '🚪 Check Out';
            markAttendanceBtn.className = 'btn-attendance checked-in';
            markAttendanceBtn.disabled = false;
            markAttendanceBtn.style.opacity = '1';
            markAttendanceBtn.style.cursor = 'pointer';
            
            updateHistory();
            updateStats();
            updateStatsCards(getAllAttendance().filter(r => r.corperId === currentUser.id));
            isProcessing = false;
        });
    });

    // ================================================================
    // UI FUNCTIONS
    // ================================================================
    function showAttendanceSection() {
        loginSection.style.display = 'none';
        attendanceSection.style.display = 'block';
        adminSection.style.display = 'none';
        displayStateCode.textContent = currentUser.stateCode;
        userName.textContent = currentUser.fullName || currentUser.name;
        userState.textContent = `${currentUser.stateName}`;
        
        const userInfoDiv = document.querySelector('.user-info');
        const userInfoInner = userInfoDiv.querySelector('div');
        
        const existingCds = userInfoInner.querySelector('.user-cds');
        if (existingCds) existingCds.remove();
        const cdsDiv = document.createElement('div');
        cdsDiv.className = 'user-cds';
        cdsDiv.innerHTML = `📚 CDS Group: <span class="cds-badge">${currentUser.cdsGroup}</span>`;
        userInfoInner.appendChild(cdsDiv);
        
        const existingAdminBtn = userInfoDiv.querySelector('.admin-dashboard-btn');
        if (existingAdminBtn) existingAdminBtn.remove();
        
        if (currentUser.isAdmin) {
            const adminBtn = document.createElement('button');
            adminBtn.className = 'admin-dashboard-btn';
            adminBtn.innerHTML = '👑 Admin Dashboard';
            adminBtn.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; border: none; padding: 10px; border-radius: 10px;
                font-size: 14px; font-weight: 600; cursor: pointer;
                margin-top: 10px; width: 100%; transition: all 0.3s;
            `;
            adminBtn.onmouseenter = function() {
                this.style.transform = 'scale(1.02)';
                this.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            };
            adminBtn.onmouseleave = function() {
                this.style.transform = 'scale(1)';
                this.style.boxShadow = 'none';
            };
            adminBtn.onclick = openAdminDashboard;
            userInfoDiv.appendChild(adminBtn);
        }
        
        const hasCheckedIn = hasUserCheckedInToday();
        const isActive = isCurrentlyCheckedIn();
        
        if (hasCheckedIn && !isActive) {
            hasCheckedInToday = true;
            isCheckedIn = false;
            markAttendanceBtn.innerHTML = '🚫 Already Checked In Today';
            markAttendanceBtn.className = 'btn-attendance disabled';
            markAttendanceBtn.disabled = true;
            markAttendanceBtn.style.opacity = '0.6';
            markAttendanceBtn.style.cursor = 'not-allowed';
        } else if (isActive) {
            isCheckedIn = true;
            hasCheckedInToday = true;
            markAttendanceBtn.innerHTML = '🚪 Check Out';
            markAttendanceBtn.className = 'btn-attendance checked-in';
            markAttendanceBtn.disabled = false;
            markAttendanceBtn.style.opacity = '1';
            markAttendanceBtn.style.cursor = 'pointer';
        } else {
            hasCheckedInToday = false;
            isCheckedIn = false;
            markAttendanceBtn.innerHTML = '<span class="btn-icon">📍</span><span class="btn-text">Check In</span>';
            markAttendanceBtn.className = 'btn-attendance';
            markAttendanceBtn.disabled = true;
            markAttendanceBtn.style.opacity = '1';
            markAttendanceBtn.style.cursor = 'pointer';
        }
        
        if (!dataLoaded) {
            loadAllRecordsFromSheet().then(() => {
                updateHistory();
                updateStats();
                const allUserRecords = getAllAttendance().filter(r => r.corperId === currentUser.id);
                updateStatsCards(allUserRecords);
                if (hasCheckedIn && isActive) {
                    updateUserNumberDisplay();
                }
            });
        } else {
            updateHistory();
            updateStats();
            const allUserRecords = getAllAttendance().filter(r => r.corperId === currentUser.id);
            updateStatsCards(allUserRecords);
            if (hasCheckedIn && isActive) {
                updateUserNumberDisplay();
            }
        }
    }

    function startAttendanceTracking() {
        updateClock();
        if (attendanceTimer) { clearInterval(attendanceTimer); }
        attendanceTimer = setInterval(updateClock, 1000);
        getLocation();
        
        loadAllRecordsFromSheet().then(() => {
            updateHistory();
            updateStats();
            if (currentUser) {
                const allUserRecords = getAllAttendance().filter(r => r.corperId === currentUser.id);
                updateStatsCards(allUserRecords);
                if (hasUserCheckedInToday() && isCurrentlyCheckedIn()) {
                    updateUserNumberDisplay();
                }
            }
        });
    }

    function updateClock() {
        const nigeriaNow = getNigeriaTime();
        currentTimeEl.textContent = nigeriaNow.toLocaleTimeString('en-NG', { hour12: false });
        currentDateEl.textContent = getNigeriaDateString();
    }

    function getLocation() {
        if (!navigator.geolocation) { updateLocationStatus('Geolocation not supported', 'error'); return; }
        updateLocationStatus('Detecting location...', 'loading');
        
        const hasCheckedIn = hasUserCheckedInToday();
        const isActive = isCurrentlyCheckedIn();
        
        if (hasCheckedIn && !isActive) {
            markAttendanceBtn.disabled = true;
            markAttendanceBtn.innerHTML = '🚫 Already Checked In Today';
            markAttendanceBtn.className = 'btn-attendance disabled';
            markAttendanceBtn.style.opacity = '0.6';
            markAttendanceBtn.style.cursor = 'not-allowed';
        } else if (isActive) {
            markAttendanceBtn.disabled = false;
            markAttendanceBtn.innerHTML = '🚪 Check Out';
            markAttendanceBtn.className = 'btn-attendance checked-in';
            markAttendanceBtn.style.opacity = '1';
            markAttendanceBtn.style.cursor = 'pointer';
        } else {
            markAttendanceBtn.disabled = true;
            markAttendanceBtn.innerHTML = '<span class="btn-icon">📍</span><span class="btn-text">Check In</span>';
            markAttendanceBtn.className = 'btn-attendance';
            markAttendanceBtn.style.opacity = '1';
            markAttendanceBtn.style.cursor = 'pointer';
        }

        if (locationWatchId) { navigator.geolocation.clearWatch(locationWatchId); }

        locationWatchId = navigator.geolocation.watchPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const result = checkAllowedAddresses(lat, lng);
                userLocation = { lat, lng, accuracy: position.coords.accuracy, isAtAddress: isAtAllowedAddress, matchedAddress: currentAddressMatch };
                const hasCheckedInToday = hasUserCheckedInToday();
                const isActive = isCurrentlyCheckedIn();
                if (isAtAllowedAddress) {
                    lgName.textContent = `✅ ${currentAddressMatch.fullAddress}`;
                    updateLocationStatus(`✅ You are at: ${currentAddressMatch.fullAddress}`, 'success');
                    if (!hasCheckedInToday) {
                        markAttendanceBtn.disabled = false;
                        markAttendanceBtn.innerHTML = '<span class="btn-icon">📍</span><span class="btn-text">Check In</span>';
                        markAttendanceBtn.className = 'btn-attendance';
                        markAttendanceBtn.style.opacity = '1';
                        markAttendanceBtn.style.cursor = 'pointer';
                    } else if (isActive) {
                        markAttendanceBtn.disabled = false;
                        markAttendanceBtn.innerHTML = '🚪 Check Out';
                        markAttendanceBtn.className = 'btn-attendance checked-in';
                        markAttendanceBtn.style.opacity = '1';
                        markAttendanceBtn.style.cursor = 'pointer';
                    }
                    if (!markAttendanceBtn.dataset.locationVerified) {
                        showMessage(`✅ Location verified! You can now mark attendance.`, 'success');
                        markAttendanceBtn.dataset.locationVerified = 'true';
                    }
                } else {
                    const closest = distanceToAddresses.reduce((min, current) => current.distance < min.distance ? current : min);
                    const distance = Math.round(closest.distance);
                    lgName.textContent = `📍 ${distance}m from nearest address`;
                    updateLocationStatus(`❌ You are ${distance}m away. Please go to an allowed address.`, 'error');
                    if (!isActive) {
                        markAttendanceBtn.disabled = true;
                        markAttendanceBtn.innerHTML = '<span class="btn-icon">📍</span><span class="btn-text">Check In</span>';
                        markAttendanceBtn.className = 'btn-attendance';
                        markAttendanceBtn.style.opacity = '1';
                        markAttendanceBtn.style.cursor = 'pointer';
                    }
                    markAttendanceBtn.dataset.locationVerified = 'false';
                }
                if (isActive) {
                    isCheckedIn = true;
                    hasCheckedInToday = true;
                    markAttendanceBtn.innerHTML = '🚪 Check Out';
                    markAttendanceBtn.className = 'btn-attendance checked-in';
                    markAttendanceBtn.disabled = false;
                    markAttendanceBtn.style.opacity = '1';
                    markAttendanceBtn.style.cursor = 'pointer';
                }
            },
            function(error) {
                console.error('Location error:', error);
                let message = 'Unable to get location. ';
                switch(error.code) {
                    case error.PERMISSION_DENIED: message += 'Please allow location access.'; break;
                    case error.POSITION_UNAVAILABLE: message += 'Location information unavailable.'; break;
                    case error.TIMEOUT: message += 'Location request timed out.'; break;
                }
                updateLocationStatus(message, 'error');
                if (!isCurrentlyCheckedIn()) markAttendanceBtn.disabled = true;
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
        );
    }

    function updateLocationStatus(message, type) {
        const dot = locationStatus.querySelector('.status-dot');
        const text = locationStatus.querySelector('.status-text');
        text.textContent = message;
        dot.className = 'status-dot ' + type;
    }

    function showMessage(text, type) {
        attendanceMessage.innerHTML = text;
        attendanceMessage.className = 'message ' + type;
        setTimeout(() => { attendanceMessage.innerHTML = ''; attendanceMessage.className = 'message'; }, 10000);
    }

    function showLoginMessage(text, type) {
        const existingMsg = document.querySelector('.login-message');
        if (existingMsg) existingMsg.remove();
        const msg = document.createElement('div');
        msg.className = `message ${type} login-message`;
        msg.innerHTML = text;
        loginForm.appendChild(msg);
        setTimeout(() => msg.remove(), 10000);
    }

    function resetUI() {
        currentTimeEl.textContent = '--:--:--';
        currentDateEl.textContent = 'Loading...';
        lgName.textContent = '--';
        markAttendanceBtn.innerHTML = '<span class="btn-icon">📍</span><span class="btn-text">Check In</span>';
        markAttendanceBtn.className = 'btn-attendance';
        markAttendanceBtn.disabled = true;
        markAttendanceBtn.dataset.locationVerified = 'false';
        markAttendanceBtn.style.opacity = '1';
        markAttendanceBtn.style.cursor = 'pointer';
        attendanceMessage.className = 'message';
        attendanceMessage.innerHTML = '';
        historyList.innerHTML = '<div class="no-history"><span class="empty-icon">📋</span><div class="empty-title">No Attendance Records</div><div class="empty-subtitle">Your attendance history will appear here once you check in</div></div>';
        recordCount.textContent = '0 records';
        totalDays.textContent = '0';
        totalHours.textContent = '0h';
        if (totalCheckinsEl) totalCheckinsEl.textContent = '0';
        if (totalCompletedEl) totalCompletedEl.textContent = '0';
        if (totalActiveEl) totalActiveEl.textContent = '0';
        if (totalDaysEl) totalDaysEl.textContent = '0';
        updateLocationStatus('Waiting for location...', 'loading');
        userNumberDisplay.style.display = 'none';
    }

    function calculateDuration(checkInTimestamp, checkOutTime) {
        const start = new Date(checkInTimestamp);
        const end = checkOutTime;
        const diffMs = end - start;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    }

    function getAMPM(timeStr) {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        if (parts.length < 2) return '';
        const hour = parseInt(parts[0]);
        return hour >= 12 ? 'PM' : 'AM';
    }

    // ================================================================
    // GENERATE REPORT - USER'S PERSONAL HISTORY
    // ================================================================
    function updateHistory() {
        if (!currentUser) return;
        
        const allRecords = getAllAttendance();
        const userRecords = allRecords.filter(r => r.corperId === currentUser.id);
        
        userRecords.sort((a, b) => {
            if (a.fullDate !== b.fullDate) return new Date(b.fullDate) - new Date(a.fullDate);
            return new Date(b.checkInTimestamp) - new Date(a.checkInTimestamp);
        });
        
        historyList.innerHTML = '';
        
        if (userRecords.length === 0) {
            historyList.innerHTML = `<div class="no-history"><span class="empty-icon">📋</span><div class="empty-title">No Attendance Records</div><div class="empty-subtitle">Your attendance history will appear here once you check in</div></div>`;
            recordCount.textContent = '0 records';
            return;
        }
        
        const uniqueDays = new Set(userRecords.map(r => r.fullDate));
        const totalCheckIns = userRecords.length;
        const completedSessions = userRecords.filter(r => r.checkOutTime).length;
        const activeSessions = totalCheckIns - completedSessions;
        recordCount.textContent = `${totalCheckIns} records · ${uniqueDays.size} days · ${activeSessions} active`;
        
        const groupedByDate = {};
        userRecords.forEach(record => {
            if (!groupedByDate[record.fullDate]) groupedByDate[record.fullDate] = [];
            groupedByDate[record.fullDate].push(record);
        });
        
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-wrapper';
        tableWrapper.style.cssText = 'overflow-x: auto; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);';
        
        const table = document.createElement('table');
        table.className = 'history-table';
        table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 14px; background: white; min-width: 800px;';
        
        const thead = document.createElement('thead');
        thead.style.cssText = `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); position: sticky; top: 0; z-index: 10;`;
        const headerRow = document.createElement('tr');
        const headers = [
            { icon: '👤', label: 'Name' },
            { icon: '🔑', label: 'State Code' },
            { icon: '📅', label: 'Date' },
            { icon: '⏰', label: 'Check In' },
            { icon: '⏰', label: 'Check Out' },
            { icon: '📚', label: 'CDS' },
            { icon: '📊', label: 'Status' },
            { icon: '⏱️', label: 'Late Min' }
        ];
        headers.forEach(h => {
            const th = document.createElement('th');
            th.innerHTML = `<span style="margin-right: 6px;">${h.icon}</span> ${h.label}`;
            th.style.cssText = `padding: 14px 16px; text-align: left; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; color: white; white-space: nowrap;`;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
        sortedDates.forEach(date => {
            const dayRecords = groupedByDate[date];
            const checkIns = dayRecords.length;
            const completed = dayRecords.filter(r => r.checkOutTime).length;
            const active = checkIns - completed;
            const dateRow = document.createElement('tr');
            dateRow.style.cssText = `background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-top: 2px solid #667eea; border-bottom: 1px solid #dee2e6;`;
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            let statusEmoji = '✅';
            let statusText = 'All completed';
            if (active > 0 && completed > 0) { statusEmoji = '🔄'; statusText = `${active} active, ${completed} completed`; }
            else if (active > 0 && completed === 0) { statusEmoji = '🟢'; statusText = `${active} active`; }
            else if (completed > 0 && active === 0) { statusEmoji = '✅'; statusText = `${completed} completed`; }
            const dateTd = document.createElement('td');
            dateTd.colSpan = 8;
            dateTd.style.cssText = 'padding: 10px 16px; font-weight: 600; color: #1a1a2e;';
            dateTd.innerHTML = `<span style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;"><span style="font-size: 14px;">📅 ${formattedDate}</span><span style="font-size: 12px; color: #7f8c8d; font-weight: 400; background: white; padding: 2px 14px; border-radius: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">${checkIns} check-in${checkIns > 1 ? 's' : ''} · ${statusEmoji} ${statusText}</span></span>`;
            dateRow.appendChild(dateTd);
            tbody.appendChild(dateRow);
            dayRecords.sort((a, b) => new Date(a.checkInTimestamp) - new Date(b.checkInTimestamp));
            dayRecords.forEach((record, index) => {
                const tr = document.createElement('tr');
                tr.style.cssText = `transition: all 0.2s ease; border-bottom: 1px solid #f1f2f6; animation: slideIn 0.3s ease forwards; opacity: 0; transform: translateY(-8px); animation-delay: ${index * 0.05}s;`;
                tr.addEventListener('mouseenter', function() { this.style.backgroundColor = '#f8f9fa'; this.style.transform = 'scale(1.002)'; this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; });
                tr.addEventListener('mouseleave', function() { this.style.backgroundColor = ''; this.style.transform = ''; this.style.boxShadow = ''; });
                
                const nameTd = document.createElement('td');
                nameTd.setAttribute('data-label', 'Name');
                nameTd.style.cssText = 'padding: 12px 16px; vertical-align: middle;';
                const initials = (record.corperName || 'U').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                nameTd.innerHTML = `<span style="display: flex; align-items: center; gap: 10px;"><span style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 700; flex-shrink: 0;">${initials}</span><span style="font-weight: 600; color: #1a1a2e; font-size: 14px;">${record.corperName || 'N/A'}</span></span>`;
                tr.appendChild(nameTd);
                
                const stateCodeTd = document.createElement('td');
                stateCodeTd.setAttribute('data-label', 'State Code');
                stateCodeTd.style.cssText = 'padding: 12px 16px; vertical-align: middle;';
                stateCodeTd.innerHTML = `<span style="font-weight: 600; color: #667eea; font-family: 'Courier New', monospace; font-size: 13px; background: rgba(102, 126, 234, 0.08); padding: 4px 12px; border-radius: 6px; display: inline-block;">${record.stateCode || record.corperId || 'N/A'}</span>`;
                tr.appendChild(stateCodeTd);
                
                const dateTd2 = document.createElement('td');
                dateTd2.setAttribute('data-label', 'Date');
                dateTd2.style.cssText = 'padding: 12px 16px; vertical-align: middle;';
                dateTd2.innerHTML = `<span style="font-size: 13px; color: #2c3e50; display: flex; align-items: center; gap: 4px;">📅 ${record.date || record.fullDate || 'N/A'}</span>`;
                tr.appendChild(dateTd2);
                
                const checkInTd = document.createElement('td');
                checkInTd.setAttribute('data-label', 'Check In');
                checkInTd.style.cssText = 'padding: 12px 16px; vertical-align: middle;';
                checkInTd.innerHTML = `<span style="font-weight: 700; color: #27ae60; font-family: 'Courier New', monospace; font-size: 15px; display: flex; align-items: center; gap: 4px;">📍 ${record.checkInTime || '--:--:--'}<span style="font-size: 10px; color: #95a5a6; font-weight: 500; font-family: -apple-system, sans-serif;">${getAMPM(record.checkInTime)}</span></span>`;
                tr.appendChild(checkInTd);
                
                const checkOutTd = document.createElement('td');
                checkOutTd.setAttribute('data-label', 'Check Out');
                checkOutTd.style.cssText = 'padding: 12px 16px; vertical-align: middle;';
                if (record.checkOutTime) {
                    checkOutTd.innerHTML = `<span style="font-weight: 700; color: #2c3e50; font-family: 'Courier New', monospace; font-size: 15px; display: flex; align-items: center; gap: 4px;">🚪 ${record.checkOutTime}<span style="font-size: 10px; color: #95a5a6; font-weight: 500; font-family: -apple-system, sans-serif;">${getAMPM(record.checkOutTime)}</span></span>`;
                } else {
                    checkOutTd.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 8px; color: #f39c12; font-weight: 600; font-size: 13px;"><span style="width: 8px; height: 8px; background: #f39c12; border-radius: 50%; animation: pulse-dot 1.5s ease-in-out infinite; display: inline-block;"></span>Active</span>`;
                }
                tr.appendChild(checkOutTd);
                
                const cdsTd = document.createElement('td');
                cdsTd.setAttribute('data-label', 'CDS');
                cdsTd.style.cssText = 'padding: 12px 16px; vertical-align: middle;';
                cdsTd.innerHTML = `<span style="font-size: 12px; font-weight: 600; color: #667eea; background: #eef2ff; padding: 4px 14px; border-radius: 20px; display: inline-block; border: 1px solid rgba(102, 126, 234, 0.15);">${record.cdsGroup || 'N/A'}</span>`;
                tr.appendChild(cdsTd);
                
                const statusTd = document.createElement('td');
                statusTd.setAttribute('data-label', 'Status');
                statusTd.style.cssText = 'padding: 12px 16px; vertical-align: middle;';
                const statusClass = record.status === 'Late' ? 'late' : 'on-time';
                const statusColor = record.status === 'Late' ? '#e74c3c' : '#27ae60';
                const statusBg = record.status === 'Late' ? '#fadbd8' : '#d5f5e3';
                statusTd.innerHTML = `<span style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: ${statusBg}; color: ${statusColor};">${record.status || 'Active'}</span>`;
                tr.appendChild(statusTd);
                
                const lateMinTd = document.createElement('td');
                lateMinTd.setAttribute('data-label', 'Late Min');
                lateMinTd.style.cssText = 'padding: 12px 16px; vertical-align: middle;';
                if (record.lateMinutes > 0) {
                    lateMinTd.innerHTML = `<span style="font-weight: 700; color: #e74c3c;">${record.lateMinutes} min</span>`;
                } else {
                    lateMinTd.innerHTML = `<span style="color: #95a5a6;">0 min</span>`;
                }
                tr.appendChild(lateMinTd);
                
                tbody.appendChild(tr);
            });
        });
        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        historyList.appendChild(tableWrapper);
        if (!document.getElementById('historyAnimations')) {
            const style = document.createElement('style');
            style.id = 'historyAnimations';
            style.textContent = `
                @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.7); } }
            `;
            document.head.appendChild(style);
        }
    }

    // ================================================================
    // UPDATE STATS
    // ================================================================
    function updateStats() {
        if (!currentUser) return;
        const allRecords = getAllAttendance();
        const userRecords = allRecords.filter(r => r.corperId === currentUser.id);
        const uniqueDays = new Set(userRecords.map(r => r.fullDate));
        totalDays.textContent = uniqueDays.size;
        let totalMinutes = 0;
        userRecords.forEach(record => {
            if (record.duration) {
                const match = record.duration.match(/(\d+)h\s+(\d+)m/);
                if (match) totalMinutes += (parseInt(match[1]) || 0) * 60 + (parseInt(match[2]) || 0);
            }
        });
        const totalHoursWorked = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        totalHours.textContent = remainingMinutes > 0 ? `${totalHoursWorked}h ${remainingMinutes}m` : `${totalHoursWorked}h`;
    }

    function updateStatsCards(records) {
        if (!records) return;
        const totalCheckins = records.length;
        const completed = records.filter(r => r.checkOutTime).length;
        const active = totalCheckins - completed;
        const uniqueDays = new Set(records.map(r => r.fullDate));
        if (totalCheckinsEl) totalCheckinsEl.textContent = totalCheckins;
        if (totalCompletedEl) totalCompletedEl.textContent = completed;
        if (totalActiveEl) totalActiveEl.textContent = active;
        if (totalDaysEl) totalDaysEl.textContent = uniqueDays.size;
    }

    // ================================================================
    // ADMIN DASHBOARD FUNCTIONS
    // ================================================================

    function openAdminDashboard() {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('⛔ Access Denied! You are not authorized to view the Admin Dashboard.', 'error');
            return;
        }
        
        if (loginSection) loginSection.style.display = 'none';
        if (attendanceSection) attendanceSection.style.display = 'none';
        if (adminSection) adminSection.style.display = 'block';
        
        userNumberDisplay.style.display = 'none';
        markAttendanceBtn.style.display = 'none';
        
        refreshDashboard();
    }

    function closeAdminDashboard() {
        if (adminSection) adminSection.style.display = 'none';
        if (currentUser) {
            if (attendanceSection) attendanceSection.style.display = 'block';
            markAttendanceBtn.style.display = 'flex';
            if (isCurrentlyCheckedIn()) {
                updateUserNumberDisplay();
            }
        } else {
            if (loginSection) loginSection.style.display = 'block';
        }
    }

    async function refreshDashboard() {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('⛔ Access Denied!', 'error');
            return;
        }
        try {
            const records = await loadAllRecordsFromSheet();
            if (records && records.length > 0) {
                updateDashboardStats(records);
                populateAdminTable(records);
            } else {
                const localRecords = getAllAttendance();
                if (localRecords && localRecords.length > 0) {
                    updateDashboardStats(localRecords);
                    populateAdminTable(localRecords);
                } else {
                    const tbody = document.getElementById('adminTableBody');
                    if (tbody) {
                        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #95a5a6;">📋 No records found</td></tr>`;
                    }
                }
            }
            updateStatsCards(getAllAttendance());
            updateStats();
            showMessage('✅ Dashboard refreshed!', 'success');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            showMessage('❌ Error loading dashboard data', 'error');
        }
    }

    function updateDashboardStats(records) {
        const uniqueUsers = new Set(records.map(r => r.corperId || r.Name || r.name));
        const totalUsersEl = document.getElementById('totalUsers');
        const totalCheckinsAdminEl = document.getElementById('totalCheckinsAdmin');
        const activeSessionsAdminEl = document.getElementById('activeSessionsAdmin');
        const totalDaysAdminEl = document.getElementById('totalDaysAdmin');
        
        if (totalUsersEl) totalUsersEl.textContent = uniqueUsers.size;
        if (totalCheckinsAdminEl) totalCheckinsAdminEl.textContent = records.length;
        
        const active = records.filter(r => {
            const status = r.Status || r.status || '';
            return status.toLowerCase() === 'active' || status === 'On Time' || status === 'Late';
        });
        if (activeSessionsAdminEl) activeSessionsAdminEl.textContent = active.length;
        
        const uniqueDays = new Set(records.map(r => r.fullDate || r['Full Date'] || r.date));
        if (totalDaysAdminEl) totalDaysAdminEl.textContent = uniqueDays.size;
    }

    // ================================================================
    // ADMIN TABLE - SEPARATE ON-TIME AND LATE LISTS
    // ================================================================
    function populateAdminTable(records) {
        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return;
        
        if (!records || records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #95a5a6;">📋 No records found</td></tr>`;
            return;
        }
        
        records.sort((a, b) => {
            const dateA = a.fullDate || a['Full Date'] || a.date || '';
            const dateB = b.fullDate || b['Full Date'] || b.date || '';
            return new Date(dateB) - new Date(dateA);
        });
        
        // Split records into On-Time and Late
        const onTimeRecords = records.filter(r => r.status !== 'Late' && r.status !== 'late');
        const lateRecords = records.filter(r => r.status === 'Late' || r.status === 'late');
        
        let html = '';
        
        // ================================================================
        // ON-TIME ATTENDEES
        // ================================================================
        if (onTimeRecords.length > 0) {
            html += `
                <tr class="section-header">
                    <td colspan="9" style="padding: 15px; background: #e8f8f0; font-weight: 700; color: #27ae60; font-size: 15px;">
                        ✅ ON-TIME ATTENDEES (${onTimeRecords.length})
                    </td>
                </tr>
            `;
            
            onTimeRecords.forEach((record) => {
                const sn = record.attendanceNumber || 'N/A';
                const name = record.corperName || record.Name || record.name || 'N/A';
                const stateCode = record.stateCode || record['State Code'] || 'N/A';
                const cdsGroup = record.cdsGroup || record['CDS group'] || 'N/A';
                const checkIn = record.checkInTime || record['Check In'] || 'N/A';
                const checkOut = record.checkOutTime || record['Check Out'] || '';
                const status = record.status || record.Status || 'On Time';
                const lateMin = record.lateMinutes || 0;
                const duration = record.duration || record.Duration || '';
                const statusClass = status.toLowerCase() === 'completed' ? 'completed' : 'on-time';
                const displayStatus = status.toLowerCase() === 'completed' ? '✅ Completed' : '🟢 On Time';
                const displayCheckOut = checkOut || '--';
                const displayDuration = duration || '--';
                const lateDisplay = lateMin > 0 ? `${lateMin} min` : '--';
                
                html += `
                    <tr>
                        <td>${sn}</td>
                        <td><strong>${name}</strong></td>
                        <td>${stateCode}</td>
                        <td>${cdsGroup}</td>
                        <td>${checkIn}</td>
                        <td>${displayCheckOut}</td>
                        <td>${displayDuration}</td>
                        <td><span class="status-badge ${statusClass}">${displayStatus}</span></td>
                        <td>
                            <button class="action-btn view" onclick="viewUserDetails('${record.id}')">📋</button>
                            <button class="action-btn delete" onclick="deleteRecord('${record.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        }
        
        // ================================================================
        // LATE COMERS
        // ================================================================
        if (lateRecords.length > 0) {
            html += `
                <tr class="section-header">
                    <td colspan="9" style="padding: 15px; background: #fadbd8; font-weight: 700; color: #e74c3c; font-size: 15px;">
                        ⚠️ LATE COMERS (${lateRecords.length})
                    </td>
                </tr>
            `;
            
            lateRecords.forEach((record) => {
                const sn = record.attendanceNumber || 'N/A';
                const name = record.corperName || record.Name || record.name || 'N/A';
                const stateCode = record.stateCode || record['State Code'] || 'N/A';
                const cdsGroup = record.cdsGroup || record['CDS group'] || 'N/A';
                const checkIn = record.checkInTime || record['Check In'] || 'N/A';
                const checkOut = record.checkOutTime || record['Check Out'] || '';
                const status = record.status || record.Status || 'Late';
                const lateMin = record.lateMinutes || 0;
                const duration = record.duration || record.Duration || '';
                const statusClass = status.toLowerCase() === 'completed' ? 'completed' : 'late';
                const displayStatus = status.toLowerCase() === 'completed' ? '✅ Completed' : '🔴 Late';
                const displayCheckOut = checkOut || '--';
                const displayDuration = duration || '--';
                const lateDisplay = lateMin > 0 ? `${lateMin} min` : '--';
                
                html += `
                    <tr>
                        <td>${sn}</td>
                        <td><strong>${name}</strong></td>
                        <td>${stateCode}</td>
                        <td>${cdsGroup}</td>
                        <td>${checkIn}</td>
                        <td>${displayCheckOut}</td>
                        <td>${displayDuration}</td>
                        <td><span class="status-badge ${statusClass}">${displayStatus}</span></td>
                        <td>
                            <button class="action-btn view" onclick="viewUserDetails('${record.id}')">📋</button>
                            <button class="action-btn delete" onclick="deleteRecord('${record.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        }
        
        if (onTimeRecords.length === 0 && lateRecords.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #95a5a6;">📋 No records found</td></tr>`;
            return;
        }
        
        tbody.innerHTML = html;
    }

    // ================================================================
    // ADMIN FUNCTIONS
    // ================================================================

    window.viewUserDetails = function(recordId) {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('⛔ Access Denied!', 'error');
            return;
        }
        const allRecords = getAllAttendance();
        const record = allRecords.find(r => r.id == recordId);
        if (!record) { showMessage('❌ Record not found', 'error'); return; }
        const details = `
            👤 Name: ${record.corperName || 'N/A'}
            🔑 State Code: ${record.stateCode || 'N/A'}
            📚 CDS Group: ${record.cdsGroup || 'N/A'}
            📅 Date: ${record.date || record.fullDate || 'N/A'}
            ⏰ Check In: ${record.checkInTime || 'N/A'}
            ⏰ Check Out: ${record.checkOutTime || '--'}
            ⏱️ Duration: ${record.duration || '--'}
            📊 Status: ${record.status || 'Active'}
            ⏱️ Late Minutes: ${record.lateMinutes || 0}
            📍 Location: ${record.address || record.street || 'N/A'}
            🛡️ Verified: ${record.verifiedBy || 'GPS'}
            📡 Accuracy: ${record.accuracy || 'N/A'}
            🔢 Attendance Number: ${record.attendanceNumber || 'N/A'}
        `;
        showMessage(details, 'info');
    };

    window.deleteRecord = async function(recordId) {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('⛔ Access Denied!', 'error');
            return;
        }
        if (!confirm('⚠️ Are you sure you want to delete this record?')) return;
        
        try {
            showMessage('🔄 Deleting record from server...', 'info');
            const success = await deleteRecordFromSheet(recordId);
            
            if (success) {
                await loadAllRecordsFromSheet();
                refreshDashboard();
                showMessage('✅ Record deleted successfully from both local and Google Sheets!', 'success');
            } else {
                showMessage('❌ Failed to delete record from Google Sheets.', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showMessage('❌ Error deleting record. Please try again.', 'error');
        }
    };

    window.exportAllData = function() {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('⛔ Access Denied!', 'error');
            return;
        }
        const allRecords = getAllAttendance();
        if (allRecords.length === 0) { showMessage('❌ No records to export', 'error'); return; }
        
        let csv = 'Attendance Number,Name,State Code,CDS Group,Date,Check In,Check Out,Status,Late Minutes,Duration,Location\n';
        allRecords.forEach((record) => {
            const status = record.status || 'Active';
            csv += `${record.attendanceNumber || 'N/A'},${record.corperName || ''},${record.stateCode || ''},${record.cdsGroup || ''},${record.date || record.fullDate || ''},${record.checkInTime || ''},${record.checkOutTime || '--'},${status},${record.lateMinutes || 0},${record.duration || '--'},${record.address || record.street || ''}\n`;
        });
        
        const uniqueUsers = new Set(allRecords.map(r => r.corperId || r.corperName));
        const uniqueDays = new Set(allRecords.map(r => r.fullDate));
        const lateCount = allRecords.filter(r => r.status === 'Late' || r.status === 'late').length;
        const onTimeCount = allRecords.length - lateCount;
        
        csv += '\n\n📊 ATTENDANCE SUMMARY\n';
        csv += `Total Records,${allRecords.length}\n`;
        csv += `Total Users,${uniqueUsers.size}\n`;
        csv += `Total Days,${uniqueDays.size}\n`;
        csv += `On Time,${onTimeCount}\n`;
        csv += `Late,${lateCount}\n`;
        csv += `Export Date,${getNigeriaDateString()}\n`;
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `NYSC_Attendance_All_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showMessage(`✅ Exported ${allRecords.length} records`, 'success');
    };

    // ================================================================
    // RESET SYSTEM
    // ================================================================
    window.resetAttendanceSystem = async function() {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('⛔ Access Denied!', 'error');
            return;
        }
        if (!confirm('⚠️⚠️⚠️ WARNING: This will DELETE ALL attendance data!\n\nAre you sure?')) return;
        if (!confirm('⚠️ THIS ACTION CANNOT BE UNDONE! Are you ABSOLUTELY sure?')) return;
        
        try {
            showMessage('🔄 Resetting system...', 'info');
            
            localStorage.removeItem('attendanceHistory');
            localStorage.removeItem('syncQueue');
            localStorage.removeItem('pendingSync');
            for (let key in localStorage) {
                if (key.startsWith('userNumber_')) localStorage.removeItem(key);
            }
            allRecords = [];
            
            await clearGoogleSheets();
            await loadAllRecordsFromSheet();
            updateHistory();
            updateStats();
            updateStatsCards([]);
            userNumberDisplay.style.display = 'none';
            
            const adminTotalUsers = document.getElementById('totalUsers');
            const adminTotalCheckins = document.getElementById('totalCheckinsAdmin');
            const adminActiveSessions = document.getElementById('activeSessionsAdmin');
            const adminTotalDays = document.getElementById('totalDaysAdmin');
            if (adminTotalUsers) adminTotalUsers.textContent = '0';
            if (adminTotalCheckins) adminTotalCheckins.textContent = '0';
            if (adminActiveSessions) adminActiveSessions.textContent = '0';
            if (adminTotalDays) adminTotalDays.textContent = '0';
            
            const adminTbody = document.getElementById('adminTableBody');
            if (adminTbody) {
                adminTbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #95a5a6;">📋 No records found</td></tr>`;
            }
            
            showMessage('✅ System reset successfully! All records cleared from both local and Google Sheets.', 'success');
        } catch (error) {
            console.error('Reset error:', error);
            showMessage('❌ Error resetting system. Please try again.', 'error');
        }
    };

    window.clearAllRecords = async function() {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('⛔ Access Denied!', 'error');
            return;
        }
        if (!confirm('⚠️ This will clear ALL attendance records from the system.\n\nContinue?')) return;
        
        try {
            showMessage('🔄 Clearing records...', 'info');
            
            localStorage.removeItem('attendanceHistory');
            localStorage.removeItem('syncQueue');
            localStorage.removeItem('pendingSync');
            allRecords = [];
            
            await clearGoogleSheets();
            await loadAllRecordsFromSheet();
            updateHistory();
            updateStats();
            updateStatsCards([]);
            userNumberDisplay.style.display = 'none';
            
            const adminTotalUsers = document.getElementById('totalUsers');
            const adminTotalCheckins = document.getElementById('totalCheckinsAdmin');
            const adminActiveSessions = document.getElementById('activeSessionsAdmin');
            const adminTotalDays = document.getElementById('totalDaysAdmin');
            if (adminTotalUsers) adminTotalUsers.textContent = '0';
            if (adminTotalCheckins) adminTotalCheckins.textContent = '0';
            if (adminActiveSessions) adminActiveSessions.textContent = '0';
            if (adminTotalDays) adminTotalDays.textContent = '0';
            
            const adminTbody = document.getElementById('adminTableBody');
            if (adminTbody) {
                adminTbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #95a5a6;">📋 No records found</td></tr>`;
            }
            
            showMessage('✅ All records cleared! Both local and Google Sheets data cleared.', 'success');
        } catch (error) {
            console.error('Clear error:', error);
            showMessage('❌ Error clearing records. Please try again.', 'error');
        }
    };

    // ================================================================
    // KEYBOARD SHORTCUTS
    // ================================================================
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && currentUser) logoutBtn.click();
    });

    // ================================================================
    // ONLINE/OFFLINE HANDLING
    // ================================================================
    window.addEventListener('online', function() {
        showMessage('🔄 Back online! Syncing data...', 'info');
        if (currentUser) {
            getLocation();
            loadAllRecordsFromSheet().then(() => {
                updateHistory();
                updateStats();
                const allUserRecords = getAllAttendance().filter(r => r.corperId === currentUser.id);
                updateStatsCards(allUserRecords);
            });
        }
    });

    window.addEventListener('offline', function() {
        showMessage('⚠️ You are offline. Data is saved locally.', 'error');
    });

    // ================================================================
    // ADMIN CLOSE BUTTON
    // ================================================================
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    if (closeAdminBtn) {
        closeAdminBtn.addEventListener('click', closeAdminDashboard);
    }

    // ================================================================
    // CONSOLE LOG
    // ================================================================
    console.log('✅ NYSC Attendance System initialized');
    console.log('📊 Primary Storage: Google Sheets (Central Database)');
    console.log('💾 Backup Storage: localStorage (Temporary Cache)');
    console.log('⏰ Nigeria Time (UTC+1) for all users');
    console.log('✅ Check-in Hours: 6:30 AM - 9:00 AM');
    console.log('⚠️ Users can ONLY check in between 6:30 AM - 9:00 AM');
    console.log('📊 Separate lists for On-Time and Late comers');
    console.log('📝 Login requires: Full Name (First + Last), State Code (unique per person)');
    console.log('👑 Admin Dashboard: Only authorized users can access');
    console.log('🗑️ Delete, Reset, and Clear sync with Google Sheets');
    console.log('⌨️  Shortcut: ESC=Logout');

    // ================================================================
    // INITIAL STATS UPDATE
    // ================================================================
    if (currentUser) {
        const allUserRecords = getAllAttendance().filter(r => r.corperId === currentUser.id);
        updateStatsCards(allUserRecords);
        if (hasUserCheckedInToday() && isCurrentlyCheckedIn()) {
            updateUserNumberDisplay();
        }
    }

});