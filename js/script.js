
/* ==========================================================
   LOCAL UTILITY DOWNTIME TRACKER
========================================================== */

"use strict";

/* ==========================================================
   DOM ELEMENTS
========================================================== */

const outageForm = document.getElementById("outageForm");
const outageTableBody = document.getElementById("outageTableBody");

const searchInput = document.getElementById("searchInput");
const filterUtility = document.getElementById("filterUtility");

const toast = document.getElementById("toast");

const totalLogs = document.getElementById("totalLogs");
const activeOutages = document.getElementById("activeOutages");
const averageDuration = document.getElementById("averageDuration");

const powerCount = document.getElementById("powerCount");
const internetCount = document.getElementById("internetCount");
const waterCount = document.getElementById("waterCount");
const avgDowntime = document.getElementById("avgDowntime");

/* ==========================================================
   STORAGE
========================================================== */

const STORAGE_KEY = "utilityOutages";
const CITY_CACHE_KEY = "cityCache";

let outages = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let cityCache = JSON.parse(localStorage.getItem(CITY_CACHE_KEY)) || [];

let editIndex = null;

/* ==========================================================
   INIT
========================================================== */

document.addEventListener("DOMContentLoaded", init);

function init() {

    

    renderTable();
    updateStatistics();
    attachEvents();
}

/* ==========================================================
   EVENTS
========================================================== */

function attachEvents() {

    outageForm.addEventListener("submit", handleSubmit);

    searchInput.addEventListener("input", renderTable);

    filterUtility.addEventListener("change", renderTable);

    const logNowButton = document.getElementById("logNow");

    logNowButton.addEventListener("click", () => {

        const now = new Date();

        const formatted = new Date(
            now.getTime() - now.getTimezoneOffset() * 60000
        ).toISOString().slice(0, 16);

        document.getElementById("startTime").value = formatted;
        document.getElementById("endTime").value = formatted;

        showToast("Current time added.");

    });

}

/* ==========================================================
   FORM
========================================================== */

async function handleSubmit(e){

    e.preventDefault();
    const saveButton = outageForm.querySelector('button[type="submit"]');

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    
    try{ 
        const data = getFormData();

        if(!validateForm(data)) return;

        data.duration = calculateDuration(
            data.startTime,
            data.endTime
        );

        const weather = await fetchWeather(data.city, data.area);

        if (weather) {
            data.weather = `${weather.temperature}°C | ${weather.rain} mm`;
        } else {
            data.weather = "--";
        }

        if(editIndex === null){

            outages.push(data);

            showToast("Outage saved successfully");

        }else{

            outages[editIndex] = data;

            editIndex = null;

            showToast("Outage updated");

        }

        saveOutages();

        renderTable();

        updateStatistics();

        outageForm.reset();
    }

    finally{

        saveButton.disabled = false;
        saveButton.textContent = "Save Outage";

    }    

}

/* ==========================================================
   GET FORM DATA
========================================================== */

function getFormData(){

    return{

        utility:document.getElementById("utility").value,

        city:document.getElementById("city").value.trim(),

        area:document.getElementById("area").value.trim(),

        severity:document.getElementById("severity").value,

        startTime:document.getElementById("startTime").value,

        endTime:document.getElementById("endTime").value,

        notes:document.getElementById("notes").value.trim()

    };

}

/* ==========================================================
   VALIDATION
========================================================== */

function validateForm(data){

    if(
        !data.utility ||
        !data.city ||
        !data.area ||
        !data.severity ||
        !data.startTime ||
        !data.endTime
    ){

        showToast("Please fill all required fields.");

        return false;

    }

    if(new Date(data.endTime) <= new Date(data.startTime)){

        showToast("End time must be after start time.");

        return false;

    }

    return true;

}

/* ==========================================================
   DURATION
========================================================== */

function calculateDuration(start,end){

    const diff =
        (new Date(end)-new Date(start))/60000;

    return Math.round(diff);

}

/* ==========================================================
   STORAGE
========================================================== */

function saveOutages(){

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(outages)
    );

}

/* ==========================================================
   TOAST
========================================================== */

function showToast(message){

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}
/* ==========================================================
   RENDER TABLE
========================================================== */

function renderTable(){

    const keyword = searchInput.value.toLowerCase();
    const utilityFilter = filterUtility.value;

   

    outageTableBody.innerHTML = "";

    const filtered = outages.filter(outage => {

        const matchesSearch =
            outage.city.toLowerCase().includes(keyword) ||
            outage.area.toLowerCase().includes(keyword) ||
            outage.utility.toLowerCase().includes(keyword);

        const matchesUtility =
            utilityFilter === "all" ||
            outage.utility === utilityFilter;

        return matchesSearch && matchesUtility;

    });

    const emptyState = document.getElementById("emptyState");

    

    if(filtered.length === 0){

        emptyState.classList.remove("hidden");
        return;

    }

    emptyState.classList.add("hidden");

    filtered.forEach((outage,index)=>{

        const row = document.createElement("tr");

        row.innerHTML = `
            <td><span class="badge ${outage.utility}">${capitalize(outage.utility)}</span></td>
            <td>${outage.city}</td>
            <td>${outage.area}</td>
            <td>${outage.duration} mins</td>
            <td>${outage.weather ?? "--"}</td>
            <td>
                <div class="action-buttons">

                    <button
                        class="action-btn edit-btn"
                        onclick="editOutage(${index})"
                        title="Edit Outage">

                        <i data-lucide="square-pen"></i>

                    </button>

                    <button
                        class="action-btn delete-btn"
                        onclick="deleteOutage(${index})"
                        title="Delete Outage">

                        <i data-lucide="trash-2"></i>

                    </button>

                </div>
            </td>
        `;
        
        
        outageTableBody.appendChild(row);
        lucide.createIcons();
    });

}

/* ==========================================================
   EDIT
========================================================== */

function editOutage(index){

    const outage = outages[index];

    document.getElementById("utility").value = outage.utility;
    document.getElementById("city").value = outage.city;
    document.getElementById("area").value = outage.area;
    document.getElementById("severity").value = outage.severity;
    document.getElementById("startTime").value = outage.startTime;
    document.getElementById("endTime").value = outage.endTime;
    document.getElementById("notes").value = outage.notes;

    editIndex = index;

    window.scrollTo({
        top: document.getElementById("log-outage").offsetTop - 80,
        behavior: "smooth"
    });

    showToast("Editing outage");

}

/* ==========================================================
   DELETE
========================================================== */

function deleteOutage(index){

    if(!confirm("Delete this outage?")) return;

    outages.splice(index,1);

    saveOutages();

    renderTable();

    updateStatistics();

    showToast("Outage deleted");

}

/* ==========================================================
   STATISTICS
========================================================== */

function updateStatistics(){

    totalLogs.textContent = outages.length;

    powerCount.textContent =
        outages.filter(o=>o.utility==="power").length;

    internetCount.textContent =
        outages.filter(o=>o.utility==="internet").length;

    waterCount.textContent =
        outages.filter(o=>o.utility==="water").length;

    activeOutages.textContent = outages.length;

    if(outages.length){

        const avg =
            outages.reduce((sum,o)=>sum+o.duration,0) /
            outages.length;

        averageDuration.textContent =
            `${Math.round(avg)}m`;

        avgDowntime.textContent =
            `${Math.round(avg)} min`;

    }else{

        averageDuration.textContent="0m";
        avgDowntime.textContent="0 min";

    }

}

/* ==========================================================
   HELPERS
========================================================== */

function capitalize(value){

    return value.charAt(0).toUpperCase() + value.slice(1);

}

/* ==========================================================
   OPEN-METEO INTEGRATION
========================================================== */

async function getCoordinates(city){

    const cached = cityCache.find(
        item => item.city.toLowerCase() === city.toLowerCase()
    );

    if(cached){
        return cached;
    }

    const url =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;

    const response = await fetch(url);

    const data = await response.json();

    if(!data.results || !data.results.length){
        throw new Error("City not found");
    }

    const location = {
        city,
        latitude: data.results[0].latitude,
        longitude: data.results[0].longitude
    };

    cityCache.push(location);

    localStorage.setItem(
        CITY_CACHE_KEY,
        JSON.stringify(cityCache)
    );

    return location;

}

async function fetchWeather(city, area) {

    const location = `${area}, ${city}`;

    try{

        const coords = await getCoordinates(city);

        const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,wind_speed_10m,rain`;

        const response = await fetch(url);

        const data = await response.json();

        updateWeatherCard(data.current);

        return {
            temperature:data.current.temperature_2m,
            wind:data.current.wind_speed_10m,
            rain:data.current.rain
        };

    }catch(error){

        console.error(error);

        showToast("Unable to fetch weather");

        return null;

    }

}

/* ==========================================================
   WEATHER CARD
========================================================== */

function updateWeatherCard(current){

    document.getElementById("weatherTemp").textContent =
        `${current.temperature_2m}°C`;

    document.getElementById("weatherWind").textContent =
        `${current.wind_speed_10m} km/h`;

    document.getElementById("weatherRain").textContent =
        `${current.rain} mm`;

    document.getElementById("summaryTemp").textContent =
        `${current.temperature_2m}°C`;

    document.getElementById("summaryWind").textContent =
        `${current.wind_speed_10m} km/h`;

    document.getElementById("summaryRain").textContent =
        `${current.rain} mm`;

    document.getElementById("summaryCondition").textContent =
        current.rain > 0 ? "Rainy" : "Clear";

    document.getElementById("weatherCondition").textContent =
        current.rain > 0 ? "Rain expected" : "Clear Sky";

    document.getElementById("weatherUpdated").textContent =
        "Updated just now";

}


/* ==========================================================
   CHARTS
========================================================== */

let utilityChart, weeklyChart, hourlyChart;

function renderCharts(){

    const utilityCounts = {
        power: outages.filter(o=>o.utility==="power").length,
        internet: outages.filter(o=>o.utility==="internet").length,
        water: outages.filter(o=>o.utility==="water").length
    };

    const utilityCtx = document.getElementById("utilityChart");

    if(utilityChart) utilityChart.destroy();

    utilityChart = new Chart(utilityCtx,{
        type:"doughnut",
        data:{
            labels:["Power","Internet","Water"],
            datasets:[{
                data:[
                    utilityCounts.power,
                    utilityCounts.internet,
                    utilityCounts.water
                ]
            }]
        },
        options:{responsive:true}
    });

    const week = Array(7).fill(0);
    const hour = Array(24).fill(0);

    outages.forEach(o=>{
        const d = new Date(o.startTime);
        week[d.getDay()]++;
        hour[d.getHours()]++;
    });

    if(weeklyChart) weeklyChart.destroy();

    weeklyChart = new Chart(
        document.getElementById("weeklyChart"),
        {
            type:"bar",
            data:{
                labels:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
                datasets:[{label:"Outages",data:week}]
            }
        }
    );

    if(hourlyChart) hourlyChart.destroy();

    hourlyChart = new Chart(
        document.getElementById("hourlyChart"),
        {
            type:"line",
            data:{
                labels:[...Array(24).keys()],
                datasets:[{label:"Hourly",data:hour}]
            }
        }
    );

}

/* ==========================================================
   CASCADE DETECTION
========================================================== */

function detectCascade(){

    const insights = [];

    outages.forEach(power=>{

        if(power.utility!=="power") return;

        const powerTime = new Date(power.startTime);

        outages.forEach(other=>{

            if(other.utility==="power") return;

            const otherTime = new Date(other.startTime);

            const diff = Math.abs(otherTime-powerTime)/60000;

            if(diff<=15){
                insights.push(
                    `${capitalize(other.utility)} outage may have been triggered by a power outage in ${other.area}.`
                );
            }

        });

    });

    return insights;

}

/* ==========================================================
   SMART INSIGHTS
========================================================== */

function renderInsights(){

    const container = document.getElementById("insightsContainer");

    const cascade = detectCascade();

    const avg = outages.length
        ? Math.round(outages.reduce((s,o)=>s+o.duration,0)/outages.length)
        : 0;

    const cards = [
        `Average outage duration is <strong>${avg} mins</strong>.`,
        cascade.length ? cascade[0] : "No cascade events detected yet.",
        `Total outages recorded: <strong>${outages.length}</strong>.`
    ];

    container.innerHTML = cards.map(msg=>`
        <article class="insight-card">
            <h3>💡 Insight</h3>
            <p>${msg}</p>
        </article>
    `).join("");

}

/* ==========================================================
   CSV EXPORT
========================================================== */

function exportCSV(){

    if(!outages.length){
        showToast("Nothing to export");
        return;
    }

    const header = Object.keys(outages[0]).join(",");

    const rows = outages.map(o=>Object.values(o).join(","));

    const csv = [header,...rows].join("\n");

    const blob = new Blob([csv],{type:"text/csv"});

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "outages.csv";
    a.click();

    URL.revokeObjectURL(url);

}

/* ==========================================================
   OVERRIDE UPDATE
========================================================== */

const oldStats = updateStatistics;

updateStatistics = function(){

    oldStats();

    renderCharts();

    renderInsights();

};

/* ==========================================
   DARK MODE
========================================== */
const themeToggle = document.getElementById("themeToggle");

// Function to update icon
function updateThemeIcon() {

    if (document.body.classList.contains("dark")) {

        themeToggle.innerHTML = '<i data-lucide="sun-medium"></i>';

    } else {

        themeToggle.innerHTML = '<i data-lucide="moon-star"></i>';

    }

    lucide.createIcons();
}

// Load saved theme
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark");
}

// Show correct icon on page load
updateThemeIcon();

// Toggle theme
themeToggle.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }

    updateThemeIcon();

});

