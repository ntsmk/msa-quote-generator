// --- Data Model ---
const rateData = [
    { id: 'workstation', name: 'Workstation', rate: 55, qty: 0, icon: '💻' },
    { id: 'small_device', name: 'Small Device', rate: 15, qty: 0, icon: '📞' },
    { id: 'medium_device', name: 'Medium Device', rate: 35, qty: 0, icon: '🖨️' },
    { id: 'large_device', name: 'Large Device', rate: 80, qty: 0, icon: '🌐' },
    { id: 'server_hw', name: 'Server Hardware', rate: 130, qty: 0, icon: '🔧' },
    { id: 'server_sw', name: 'Server Software', rate: 130, qty: 0, icon: '⚙️' },
    { id: 'critical_device', name: 'Critical Device', rate: 90, qty: 0, icon: '🚨' },
    { id: 'crit_server_hw', name: 'Critical Server Hardware', rate: 175, qty: 0, icon: '🚨' },
    { id: 'crit_server_sw', name: 'Critical Server Software', rate: 175, qty: 0, icon: '🚨' }
];

// --- DOM Elements --- -> JS will populate those
const inputContainer = document.getElementById('input-container');
//const rateTableBody = document.getElementById('rate-table-body');
const grandTotalDisplay = document.getElementById('grand-total-display');
const totalItemsDisplay = document.getElementById('total-items-display');

// --- Chart Variables ---
let costBreakdownChart = null;
let rateComparisonChart = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initCharts();
    updateCalculations();
});

// What does this? ->
// --- UI Generation Functions ---
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

        // // Reference Table Row
        // const tableRow = document.createElement('tr');
        // tableRow.innerHTML = `
        //     <td class="px-4 py-2 border-b border-stone-50">${item.icon} ${item.name}</td>
        //     <td class="px-4 py-2 border-b border-stone-50 text-right font-mono text-stone-600">${item.rate}</td>
        // `;
        // rateTableBody.appendChild(tableRow);
    });
}

// What does this? ->
// --- Interaction Logic ---
function handleInputChange(inputElement) {
    const index = inputElement.dataset.index;
    let val = parseInt(inputElement.value);

    // Validate input
    if (isNaN(val) || val < 0) val = 0;

    // Update Data Model
    rateData[index].qty = val;

    // Update UI
    updateCalculations();
}

// What does this? ->
function updateCalculations() {
    let grandTotal = 0;
    let totalItems = 0;
    const chartLabels = [];
    const chartData = [];
    const chartColors = [];

    // Base colors for chart
    const colors = [
        '#78716c', '#a8a29e', '#d6d3d1', // Stone shades
        '#f59e0b', '#d97706', '#b45309', // Amber shades
        '#3b82f6', '#2563eb', '#1d4ed8'  // Blue shades for servers
    ];

    rateData.forEach((item, index) => {
        const subtotal = item.rate * item.qty;
        grandTotal += subtotal;
        totalItems += item.qty;

        // Update row subtotal text
        document.getElementById(`subtotal-${index}`).innerText = `CA$${subtotal.toLocaleString()}`;

        // Prepare Chart Data (only include items with cost > 0)
        if (subtotal > 0) {
            chartLabels.push(item.name);
            chartData.push(subtotal);
            chartColors.push(colors[index % colors.length]);
        }
    });

    // Update Grand Total Display
    grandTotalDisplay.innerText = grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    totalItemsDisplay.innerText = totalItems;

    // Update Charts
    updateCostChart(chartLabels, chartData, chartColors);
}

// What does this? ->
// --- Chart Functions ---
function initCharts() {
    // 1. Donut Chart (Cost Breakdown)
    const ctxCost = document.getElementById('costBreakdownChart').getContext('2d');
    costBreakdownChart = new Chart(ctxCost, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                },
                tooltip: {
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
                title: {
                    display: true,
                    text: 'Monthly Cost by Asset Type',
                    padding: { bottom: 20 },
                    font: { family: "'Inter', sans-serif", size: 14, weight: 'normal' },
                    color: '#78716c'
                }
            },
            cutout: '65%'
        }
    });

    // 2. Bar Chart (Rate Comparison)
    const ctxRate = document.getElementById('rateComparisonChart').getContext('2d');

    // Prepare data for static rate chart
    const labels = rateData.map(d => d.name);
    const data = rateData.map(d => d.rate);

    rateComparisonChart = new Chart(ctxRate, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Rate (CA$)',
                data: data,
                backgroundColor: '#d6d3d1',
                hoverBackgroundColor: '#d97706',
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Horizontal Bar Chart
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: "'Inter', sans-serif" } }
                },
                y: {
                    grid: { display: false },
                    ticks: { autoSkip: false, font: { family: "'Inter', sans-serif", size: 11 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `CA$${context.parsed.x}`;
                        }
                    }
                }
            }
        }
    });
}

// What does this? ->
function updateCostChart(labels, data, colors) {
    if (!costBreakdownChart) return;

    // Update data
    costBreakdownChart.data.labels = labels;
    costBreakdownChart.data.datasets[0].data = data;
    costBreakdownChart.data.datasets[0].backgroundColor = colors;

    // Update chart title based on data presence
    if (data.length === 0) {
         costBreakdownChart.options.plugins.title.text = 'Enter quantities to see breakdown';
    } else {
         costBreakdownChart.options.plugins.title.text = 'Monthly Cost by Asset Type';
    }

    costBreakdownChart.update();
}

function exportToPDF() {
    const element = document.body; // or document.getElementById('your-content-id')
    const opt = {
        margin: 0.5,
        filename: 'estimate.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
}