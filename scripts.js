// Global Variables
let salesData = [];
let currentUser = null;
const omanGovernorates = [
    'Muscat', 'Dhofar', 'Al Batinah', 'Al Buraimi', 'Al Dakhiliyah', 
    'Al Wusta', 'Ash Sharqiyah North', 'Ash Sharqiyah South', 'Musandam'
];

// DOM Elements
const themeSwitch = document.getElementById('themeSwitch');
const logoutBtn = document.getElementById('logoutBtn');
const userRoleBadge = document.getElementById('userRoleBadge');
const adminUploadLi = document.getElementById('adminUploadLi');
const uploadBtn = document.getElementById('uploadBtn');
const dateRange = document.getElementById('dateRange');
const customDateRange = document.getElementById('customDateRange');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const regionFilter = document.getElementById('regionFilter');
const categoryFilter = document.getElementById('categoryFilter');
const salespersonFilter = document.getElementById('salespersonFilter');
const recentTransactions = document.getElementById('recentTransactions');

// Chart Instances
let revenueChart, topProductsChart, regionalSalesChart, customerChart, leaderboardChart;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check user authentication
    checkAuth();
    
    // Load data
    loadData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize theme
    initTheme();
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    userRoleBadge.textContent = currentUser.role === 'admin' ? 'Admin' : 'Sales';
    userRoleBadge.className = currentUser.role === 'admin' ? 'badge bg-danger' : 'badge bg-primary';
    
    if (currentUser.role === 'admin') {
        adminUploadLi.style.display = 'block';
    }
}

function loadData() {
    // In a real app, this would fetch from your backend
    fetch('data/sales_data.json')
        .then(response => response.json())
        .then(data => {
            salesData = data;
            updateDashboard();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            // Load sample data if file not found
            loadSampleData();
        });
}

function loadSampleData() {
    // This would be sample data structure
    salesData = [
        {
            "transaction_id": "SALE-2023-001",
            "product_name": "MacBook Pro 14\"",
            "product_category": "Electronics",
            "region": "Muscat",
            "city": "Muscat",
            "customer_type": "Corporate",
            "amount_omr": 1450.500,
            "quantity": 2,
            "discount_omr": 72.525,
            "sale_date": "2023-06-15",
            "salesperson_id": "EMP-001",
            "payment_method": "Credit Card",
            "profit_omr": 435.150,
            "return_flag": 0
        },
        // Add more sample records...
    ];
    
    updateDashboard();
}

function setupEventListeners() {
    // Theme switcher
    themeSwitch.addEventListener('change', toggleTheme);
    
    // Logout
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
    
    // Date range filter
    dateRange.addEventListener('change', function() {
        if (this.value === 'custom') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
            updateDashboard();
        }
    });
    
    // Custom date range
    startDate.addEventListener('change', updateDashboard);
    endDate.addEventListener('change', updateDashboard);
    
    // Other filters
    regionFilter.addEventListener('change', updateDashboard);
    categoryFilter.addEventListener('change', updateDashboard);
    salespersonFilter.addEventListener('change', updateDashboard);
    
    // Data upload
    uploadBtn.addEventListener('click', uploadData);
}

function initTheme() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    themeSwitch.checked = darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
}

function toggleTheme() {
    const darkMode = themeSwitch.checked;
    localStorage.setItem('darkMode', darkMode);
    document.body.classList.toggle('dark-mode', darkMode);
}

function updateDashboard() {
    if (!salesData.length) return;
    
    // Apply filters
    const filteredData = applyFilters();
    
    // Update KPIs
    updateKPIs(filteredData);
    
    // Update charts
    updateCharts(filteredData);
    
    // Update recent transactions
    updateRecentTransactions(filteredData);
}

function applyFilters() {
    let filteredData = [...salesData];
    
    // Date range filter
    const dateRangeValue = dateRange.value;
    if (dateRangeValue !== 'custom' && dateRangeValue !== 'all') {
        const days = parseInt(dateRangeValue);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        filteredData = filteredData.filter(item => {
            const saleDate = new Date(item.sale_date);
            return saleDate >= cutoffDate;
        });
    } else if (dateRangeValue === 'custom' && startDate.value && endDate.value) {
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        
        filteredData = filteredData.filter(item => {
            const saleDate = new Date(item.sale_date);
            return saleDate >= start && saleDate <= end;
        });
    }
    
    // Region filter
    const regionValue = regionFilter.value;
    if (regionValue !== 'all') {
        filteredData = filteredData.filter(item => item.region === regionValue);
    }
    
    // Category filter
    const categoryValue = categoryFilter.value;
    if (categoryValue !== 'all') {
        filteredData = filteredData.filter(item => item.product_category === categoryValue);
    }
    
    // Salesperson filter
    const salespersonValue = salespersonFilter.value;
    if (salespersonValue !== 'all') {
        filteredData = filteredData.filter(item => item.salesperson_id === salespersonValue);
    }
    
    return filteredData;
}

function updateKPIs(data) {
    if (!data.length) return;
    
    // Calculate metrics
    const totalRevenue = data.reduce((sum, item) => sum + parseFloat(item.amount_omr), 0);
    const totalCost = data.reduce((sum, item) => sum + (parseFloat(item.amount_omr) - parseFloat(item.profit_omr)), 0);
    const grossProfit = totalRevenue - totalCost;
    const netProfit = data.reduce((sum, item) => sum + parseFloat(item.profit_omr), 0);
    const avgOrder = totalRevenue / data.length;
    
    // Find top product
    const productSales = {};
    data.forEach(item => {
        if (!productSales[item.product_name]) {
            productSales[item.product_name] = 0;
        }
        productSales[item.product_name] += parseFloat(item.amount_omr);
    });
    
    const topProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
    
    // Update DOM
    document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(3) + ' OMR';
    document.getElementById('grossProfit').textContent = grossProfit.toFixed(3) + ' OMR';
    document.getElementById('netProfit').textContent = netProfit.toFixed(3) + ' OMR';
    document.getElementById('avgOrder').textContent = avgOrder.toFixed(3) + ' OMR';
    document.getElementById('topProduct').textContent = topProduct ? topProduct[0] : '-';
    
    // TODO: Calculate growth rates and update trends
}


function updateCharts(data) {
    updateRevenueChart(data);
    updateTopProductsChart(data);
    updateRegionalSalesChart(data);
    updateCustomerChart(data);
    updateLeaderboardChart(data);
}

function updateRevenueChart(data) {
    // Group by date
    const dailySales = {};
    data.forEach(item => {
        const date = item.sale_date;
        if (!dailySales[date]) {
            dailySales[date] = 0;
        }
        dailySales[date] += parseFloat(item.amount_omr);
    });
    
    const sortedDates = Object.keys(dailySales).sort();
    const revenueData = sortedDates.map(date => dailySales[date]);
    
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Daily Revenue (OMR)',
                data: revenueData,
                borderColor: '#3498DB',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.raw.toFixed(3) + ' OMR';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(3) + ' OMR';
                        }
                    }
                }
            }
        }
    });
}

function updateTopProductsChart(data) {
    // Group by product
    const productSales = {};
    data.forEach(item => {
        if (!productSales[item.product_name]) {
            productSales[item.product_name] = 0;
        }
        productSales[item.product_name] += parseFloat(item.amount_omr);
    });
    
    // Sort and get top 5
    const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    
    if (topProductsChart) {
        topProductsChart.destroy();
    }
    
    topProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topProducts.map(item => item[0]),
            datasets: [{
                label: 'Revenue (OMR)',
                data: topProducts.map(item => item[1]),
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(241, 196, 15, 0.7)',
                    'rgba(230, 126, 34, 0.7)'
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(155, 89, 182, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(230, 126, 34, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw.toFixed(3) + ' OMR';
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(3) + ' OMR';
                        }
                    }
                }
            }
        }
    });
}

function updateRegionalSalesChart(data) {
    // Group by region
    const regionSales = {};
    omanGovernorates.forEach(region => {
        regionSales[region] = 0;
    });
    
    data.forEach(item => {
        if (regionSales.hasOwnProperty(item.region)) {
            regionSales[item.region] += parseFloat(item.amount_omr);
        }
    });
    
    const ctx = document.getElementById('regionalSalesChart').getContext('2d');
    
    if (regionalSalesChart) {
        regionalSalesChart.destroy();
    }
    
    // For a real implementation, you would use chartjs-chart-geo
    // This is a simplified version with a bar chart
    regionalSalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(regionSales),
            datasets: [{
                label: 'Revenue by Region (OMR)',
                data: Object.values(regionSales),
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw.toFixed(3) + ' OMR';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(3) + ' OMR';
                        }
                    }
                }
            }
        }
    });
}

function updateCustomerChart(data) {
    // Group by customer type
    const customerTypes = ['Corporate', 'Retail', 'Wholesale'];
    const customerData = {};
    customerTypes.forEach(type => {
        customerData[type] = 0;
    });
    
    data.forEach(item => {
        if (customerData.hasOwnProperty(item.customer_type)) {
            customerData[item.customer_type] += parseFloat(item.amount_omr);
        }
    });
    
    const ctx = document.getElementById('customerChart').getContext('2d');
    
    if (customerChart) {
        customerChart.destroy();
    }
    
    customerChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: customerTypes,
            datasets: [{
                data: customerTypes.map(type => customerData[type]),
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(241, 196, 15, 0.7)'
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(241, 196, 15, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.raw.toFixed(3) + ' OMR';
                        }
                    }
                },
                datalabels: {
                    formatter: (value) => {
                        return value.toFixed(3) + ' OMR';
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function updateLeaderboardChart(data) {
    // Group by salesperson
    const salespersonData = {};
    data.forEach(item => {
        if (!salespersonData[item.salesperson_id]) {
            salespersonData[item.salesperson_id] = 0;
        }
        salespersonData[item.salesperson_id] += parseFloat(item.amount_omr);
    });
    
    // Sort by revenue
    const sortedSalespeople = Object.entries(salespersonData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const ctx = document.getElementById('leaderboardChart').getContext('2d');
    
    if (leaderboardChart) {
        leaderboardChart.destroy();
    }
    
    leaderboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedSalespeople.map(item => `EMP-${item[0].split('-')[1]}`),
            datasets: [{
                label: 'Revenue (OMR)',
                data: sortedSalespeople.map(item => item[1]),
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw.toFixed(3) + ' OMR';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(3) + ' OMR';
                        }
                    }
                }
            }
        }
    });
}

function updateRecentTransactions(data) {
    // Get most recent 5 transactions
    const recent = [...data]
        .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))
        .slice(0, 5);
    
    // Clear existing rows
    recentTransactions.innerHTML = '';
    
    // Add new rows
    recent.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.sale_date}</td>
            <td>${item.product_name}</td>
            <td>${parseFloat(item.amount_omr).toFixed(3)} OMR</td>
            <td><span class="badge ${item.return_flag === '1' ? 'bg-danger' : 'bg-success'}">
                ${item.return_flag === '1' ? 'Returned' : 'Completed'}
            </span></td>
        `;
        recentTransactions.appendChild(row);
    });
}

function uploadData() {
    const fileInput = document.getElementById('dataFile');
    const replaceData = document.getElementById('replaceData').checked;
    
    if (!fileInput.files.length) {
        alert('Please select a file to upload');
        return;
    }
    
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replace', replaceData);
    
    fetch('upload.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Data uploaded successfully');
            loadData(); // Reload data
            $('#uploadModal').modal('hide'); // Close modal
        } else {
            alert('Error uploading data: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error uploading file');
    });
    
}