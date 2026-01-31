// Chart generation for different calculators
let currentChart = null;

function generateChart(results, calcType) {
    const canvas = document.getElementById('resultChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy previous chart if it exists
    if (currentChart) {
        currentChart.destroy();
    }
    
    let chartConfig = {};
    
    switch(calcType) {
        case 'npv':
            chartConfig = {
                type: 'bar',
                data: {
                    labels: results.cashFlows.map((_, i) => `Year ${i + 1}`),
                    datasets: [{
                        label: 'Cash Flows',
                        data: results.cashFlows,
                        backgroundColor: 'rgba(102, 126, 234, 0.6)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        borderWidth: 2
                    }, {
                        label: 'Present Value of Cash Flows',
                        data: results.pvCashFlows,
                        backgroundColor: 'rgba(118, 75, 162, 0.6)',
                        borderColor: 'rgba(118, 75, 162, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Cash Flows vs Present Value',
                            font: { size: 16 }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            };
            break;
            
        case 'roi':
            chartConfig = {
                type: 'doughnut',
                data: {
                    labels: ['Initial Investment', 'Return'],
                    datasets: [{
                        data: [results.initial, results.totalReturn],
                        backgroundColor: [
                            'rgba(118, 75, 162, 0.8)',
                            'rgba(102, 126, 234, 0.8)'
                        ],
                        borderColor: [
                            'rgba(118, 75, 162, 1)',
                            'rgba(102, 126, 234, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Investment Breakdown',
                            font: { size: 16 }
                        },
                        legend: {
                            display: true,
                            position: 'bottom'
                        }
                    }
                }
            };
            break;
            
        case 'breakeven':
            // Generate data points for break-even chart
            const maxUnits = Math.ceil(results.breakEvenUnits * 2);
            const units = [];
            const totalRevenue = [];
            const totalCosts = [];
            
            for (let i = 0; i <= maxUnits; i += Math.ceil(maxUnits / 20)) {
                units.push(i);
                totalRevenue.push(i * results.price);
                totalCosts.push(results.fixedCosts + (i * results.variableCost));
            }
            
            chartConfig = {
                type: 'line',
                data: {
                    labels: units,
                    datasets: [{
                        label: 'Total Revenue',
                        data: totalRevenue,
                        borderColor: 'rgba(102, 126, 234, 1)',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true
                    }, {
                        label: 'Total Costs',
                        data: totalCosts,
                        borderColor: 'rgba(118, 75, 162, 1)',
                        backgroundColor: 'rgba(118, 75, 162, 0.1)',
                        borderWidth: 3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Break-Even Analysis',
                            font: { size: 16 }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        annotation: {
                            annotations: {
                                line1: {
                                    type: 'line',
                                    xMin: results.breakEvenUnits,
                                    xMax: results.breakEvenUnits,
                                    borderColor: 'rgb(255, 99, 132)',
                                    borderWidth: 2,
                                    label: {
                                        content: 'Break-Even Point',
                                        enabled: true
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Units Sold'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount ($)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            };
            break;
            
        case 'payback':
            chartConfig = {
                type: 'line',
                data: {
                    labels: results.yearByYearRecovery.map(item => `Year ${item.year}`),
                    datasets: [{
                        label: 'Cumulative Cash Flow',
                        data: results.yearByYearRecovery.map(item => item.cumulative),
                        borderColor: 'rgba(102, 126, 234, 1)',
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Investment Recovery Over Time',
                            font: { size: 16 }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            };
            break;
            
        case 'eoq':
            chartConfig = {
                type: 'bar',
                data: {
                    labels: ['Ordering Cost', 'Holding Cost'],
                    datasets: [{
                        label: 'Cost Breakdown',
                        data: [results.totalOrderingCost, results.totalHoldingCost],
                        backgroundColor: [
                            'rgba(102, 126, 234, 0.8)',
                            'rgba(118, 75, 162, 0.8)'
                        ],
                        borderColor: [
                            'rgba(102, 126, 234, 1)',
                            'rgba(118, 75, 162, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'EOQ Cost Breakdown',
                            font: { size: 16 }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            };
            break;
            
        case 'cac':
            chartConfig = {
                type: 'pie',
                data: {
                    labels: ['Marketing Costs', 'Sales Costs'],
                    datasets: [{
                        data: [results.marketingCosts, results.salesCosts],
                        backgroundColor: [
                            'rgba(102, 126, 234, 0.8)',
                            'rgba(118, 75, 162, 0.8)'
                        ],
                        borderColor: [
                            'rgba(102, 126, 234, 1)',
                            'rgba(118, 75, 162, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Acquisition Cost Distribution',
                            font: { size: 16 }
                        },
                        legend: {
                            display: true,
                            position: 'bottom'
                        }
                    }
                }
            };
            break;
            
        case 'ltv':
            const years = [];
            const cumulativeValue = [];
            for (let i = 1; i <= results.lifespan; i++) {
                years.push(`Year ${i}`);
                cumulativeValue.push((results.ltv / results.lifespan) * i);
            }
            
            chartConfig = {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Cumulative Customer Value',
                        data: cumulativeValue,
                        borderColor: 'rgba(102, 126, 234, 1)',
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Customer Value Over Time',
                            font: { size: 16 }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            };
            break;
    }
    
    currentChart = new Chart(ctx, chartConfig);
}
