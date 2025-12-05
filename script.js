// --- Data Model ---
const rateData = [
    { id: 'workstation', name: 'Workstation', rate: 55, qty: 0, icon: '💻', color: '#145a03ff' },
    { id: 'small_device', name: 'Small Device', rate: 15, qty: 0, icon: '☎️', color: '#088527ff' },
    { id: 'medium_device', name: 'Medium Device', rate: 35, qty: 0, icon: '🖨️', color: '#2ce745ff' },
    { id: 'large_device', name: 'Large Device', rate: 80, qty: 0, icon: '🌐', color: '#7edf6bff' },
    { id: 'server_hw', name: 'Server Hardware', rate: 130, qty: 0, icon: '🔧', color: '#0a0063ff' },
    { id: 'server_sw', name: 'Server Software', rate: 130, qty: 0, icon: '⚙️', color: '#3744fdff' },
    { id: 'critical_device', name: 'Critical Device', rate: 90, qty: 0, icon: '🚨', color: '#ef4444' },
    { id: 'crit_server_hw', name: 'Critical Server Hardware', rate: 175, qty: 0, icon: '🚨', color: '#dc2626' },
    { id: 'crit_server_sw', name: 'Critical Server Software', rate: 175, qty: 0, icon: '🚨', color: '#b91c1c' }
];

// --- DOM Elements --- 
const inputContainer = document.getElementById('input-container'); // it is container, becasue of several fields
const grandTotalDisplay = document.getElementById('grand-total-display');
const totalItemsDisplay = document.getElementById('total-items-display');
const originalTotalDisplay = document.getElementById('original-total-display');
const originalPriceContainer = document.getElementById('original-price-container'); // it is container, because of the strike-through styling
const discountBadge = document.getElementById('discount-badge');

// --- State ---
let currentDiscount = 0;

// --- Chart Variables ---
let costBreakdownChart = null;
let rateComparisonChart = null;

// --- Initialization ---
// After DOM content load, do run 3 functions.
document.addEventListener('DOMContentLoaded', () => {
    initUI(); // set up buttons, event listeners, inputs
    initCharts(); // set up pie chart
    updateCalculations(); // sync everything + show correct values
});

// --- For Save as PDF button ---
function exportToPDF() {
    const element = document.body; // capturing inside of <body> tag
    const opt = {
        margin: 0.5,
        filename: 'msa-estimate.pdf',
        image: { type: 'jpeg', quality: 0.98 }, // html2pdf internally converts the DOM (HTML) → to a canvas screenshot, it is stored as jpeg
        html2canvas: { scale: 2 }, // Avoids blurry text in PDF by making it sharper
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
}

// --- UI Generation Functions ---
// It runs after 'DOMContentLoaded' - 1
function initUI() {
    // Generate Input Rows
    rateData.forEach((item, index) => {
        // Input Row
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between p-3 rounded-lg hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200';
        row.innerHTML = `
            <div class="flex items-center space-x-3 flex-1">
                <span class="text-2xl" role="img" aria-label="${item.name}">${item.icon}</span>
                <div>
                    <p class="font-medium text-stone-800">${item.name}</p>
                    <p class="text-xs text-stone-500">Rate: CA$${item.rate}/mo</p>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="text-right hidden sm:block w-24">
                    <span class="text-xs text-stone-400 block">Subtotal</span>
                    <span class="font-semibold text-stone-700" id="subtotal-${index}">CA$0.00</span>
                </div>
                <input type="number" min="0" value="0" data-index="${index}"
                    class="qty-input w-20 p-2 text-right border border-stone-300 rounded-lg text-stone-800 font-semibold bg-white shadow-sm"
                    onchange="handleInputChange(this)" oninput="handleInputChange(this)">
            </div>
        `;
        inputContainer.appendChild(row);
    });
}

// TODO comprehend here
// --- Interaction Logic ---
function handleInputChange(inputElement) { // it is not called directly from html, that is why passing inputElement
    // but it is called hardcoded html in function initUI(). That means once the page is loaded, along with creating item rows. Each rows has this function.
    // onchange="handleInputChange(this)" oninput="handleInputChange(this)" -> this means in this case, the <input> element. <input type="number" min="0" value="0" data-index="${index}", the number user typed.
    const index = inputElement.dataset.index;
    let val = parseInt(inputElement.value);  // entered value

    // Validate input
    if (isNaN(val) || val < 0) val = 0; // NaN = user deletes the value. (empty etring) NaN stands for "Not-a-Number.
    // a form of defensive programming.

    // Update Data Model
    rateData[index].qty = val; // updating the inside of array value for entered value
    // but rateData is declared as const, why changeable? -> const wont allow you to change whole box entirely but modifying inside of array is fine

    // Update UI
    updateCalculations();
}

// Handle commitment period changes
function handleCommitmentChange() { // this does not need parameter becasue it is called directly from html onchange="handleCommitmentChange()"
    const selectedRadio = document.querySelector('input[name="commitment"]:checked');
    currentDiscount = parseFloat(selectedRadio.value); // getting discount percent already set in html side
    updateCalculations();
}

// It runs after 'DOMContentLoaded' - 3
function updateCalculations() {
    // Declaring variables, it is accessible from only inside
    let grandTotal = 0;
    let totalItems = 0;
    const chartLabels = [];
    const chartData = [];
    const chartColors = [];

    rateData.forEach((item, index) => { // run for loop first, and then do the transaction below. item = workstation, index = 0
        const subtotal = item.rate * item.qty; // just calcurate for each item's number
        grandTotal += subtotal;
        totalItems += item.qty;

        // Update row subtotal text
        document.getElementById(`subtotal-${index}`).innerText = `CA$${subtotal.toLocaleString()}`;

        // Prepare Chart Data (only include items with cost > 0)
        if (subtotal > 0) {
            chartLabels.push(item.name); //.push is .append in python. Adding the data into the list
            chartData.push(subtotal);
            chartColors.push(item.color);
        }
    });

    // Calculate discounted total
    const discountedTotal = grandTotal * (1 - currentDiscount / 100);

    // Update Grand Total Display
    if (currentDiscount > 0) { // when discounts exist
        // Show original price with strikethrough
        originalPriceContainer.classList.remove('hidden');
        originalTotalDisplay.innerText = grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}); // Example: 1234.5 → "1,234.50"
        discountBadge.innerText = `-${currentDiscount}%`;
        grandTotalDisplay.innerText = discountedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}); // converting the number for dicounted ammount
    } else { // when no discounts exist
        // Hide original price, show regular price
        originalPriceContainer.classList.add('hidden');
        grandTotalDisplay.innerText = grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
    
    totalItemsDisplay.innerText = totalItems;

    // Update Charts
    updateCostChart(chartLabels, chartData, chartColors); // running this function by passing 3 lists the data added
}

// --- Chart Functions ---
// It runs after 'DOMContentLoaded' - 2 
function initCharts() {
    // Donut Chart (Cost Breakdown)
    const ctxCost = document.getElementById('costBreakdownChart').getContext('2d'); // .getContext('2d') tells Chart.js to draw a 2D chart on it, need to do this before creating chart
    costBreakdownChart = new Chart(ctxCost, { // creating chart object
        type: 'doughnut', // declaring donuts type chart
        data: { // initializing the empty dataset, the actual dataset will be updated by running updateCostChart()
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0,
                hoverOffset: 4 // slice moves 4 pixels outward from the center. It is not obvious but slightly hovers
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { // Chart.js lets you customize UI using "plugins"
                legend: { // Where legend goes, label config
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                },
                tooltip: { // generating label name + price for the popup when you hover a slice.
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                },
                title: { // These are obvious config
                    display: true,
                    text: 'Monthly Cost by Asset Type',
                    padding: { bottom: 20 },
                    font: { family: "'Inter', sans-serif", size: 14, weight: 'normal' },
                    color: '#78716c'
                }
            },
            cutout: '65%' // Donut hole size
        }
    });
}

function updateCostChart(labels, data, colors) {
    if (!costBreakdownChart) return; // if the variable is null, undefined, or otherwise not yet created then this function stops here

    // Update data with data passed 
    costBreakdownChart.data.labels = labels;
    costBreakdownChart.data.datasets[0].data = data;
    costBreakdownChart.data.datasets[0].backgroundColor = colors;

    // Update chart title based on data presence
    if (data.length === 0) { // Why === instead of == -> because if == then "0" will be allowed instead of 0, it is more safer
         costBreakdownChart.options.plugins.title.text = 'Enter quantities to see breakdown';
    } else {
         costBreakdownChart.options.plugins.title.text = 'Monthly Cost by Asset Type';
    }

    costBreakdownChart.update(); // built-in function from Chart.js
}

