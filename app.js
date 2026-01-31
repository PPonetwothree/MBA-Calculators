// Calculator templates and logic
const calculatorTemplates = {
    npv: {
        title: 'Net Present Value (NPV) Calculator',
        description: 'Calculate the present value of future cash flows minus the initial investment',
        fields: [
            { name: 'initialInvestment', label: 'Initial Investment ($)', type: 'number', placeholder: '100000', help: 'The upfront cost of the investment' },
            { name: 'discountRate', label: 'Discount Rate (%)', type: 'number', placeholder: '10', help: 'Required rate of return or cost of capital' },
            { name: 'cashFlows', label: 'Annual Cash Flows ($)', type: 'textarea', placeholder: '30000, 35000, 40000, 45000, 50000', help: 'Enter cash flows separated by commas' }
        ],
        calculate: function(data) {
            const initialInvestment = parseFloat(data.initialInvestment);
            const discountRate = parseFloat(data.discountRate) / 100;
            const cashFlows = data.cashFlows.split(',').map(cf => parseFloat(cf.trim()));
            
            let npv = -initialInvestment;
            const pvCashFlows = [];
            
            cashFlows.forEach((cf, index) => {
                const pv = cf / Math.pow(1 + discountRate, index + 1);
                pvCashFlows.push(pv);
                npv += pv;
            });
            
            return {
                npv: npv,
                initialInvestment: initialInvestment,
                totalPVCashFlows: pvCashFlows.reduce((a, b) => a + b, 0),
                cashFlows: cashFlows,
                pvCashFlows: pvCashFlows,
                discountRate: discountRate
            };
        }
    },
    
    roi: {
        title: 'Return on Investment (ROI) Calculator',
        description: 'Measure the profitability of an investment',
        fields: [
            { name: 'initialInvestment', label: 'Initial Investment ($)', type: 'number', placeholder: '50000' },
            { name: 'finalValue', label: 'Final Value ($)', type: 'number', placeholder: '75000' },
            { name: 'timeHorizon', label: 'Time Horizon (years)', type: 'number', placeholder: '3', help: 'Investment duration' }
        ],
        calculate: function(data) {
            const initial = parseFloat(data.initialInvestment);
            const final = parseFloat(data.finalValue);
            const years = parseFloat(data.timeHorizon);
            
            const totalReturn = final - initial;
            const roi = (totalReturn / initial) * 100;
            const annualizedROI = (Math.pow(final / initial, 1 / years) - 1) * 100;
            
            return {
                totalReturn: totalReturn,
                roi: roi,
                annualizedROI: annualizedROI,
                initial: initial,
                final: final,
                years: years
            };
        }
    },
    
    breakeven: {
        title: 'Break-Even Analysis Calculator',
        description: 'Calculate the point where total revenue equals total costs',
        fields: [
            { name: 'fixedCosts', label: 'Fixed Costs ($)', type: 'number', placeholder: '50000', help: 'Costs that don\'t change with production volume' },
            { name: 'pricePerUnit', label: 'Price Per Unit ($)', type: 'number', placeholder: '100' },
            { name: 'variableCostPerUnit', label: 'Variable Cost Per Unit ($)', type: 'number', placeholder: '60', help: 'Cost per unit produced' }
        ],
        calculate: function(data) {
            const fixedCosts = parseFloat(data.fixedCosts);
            const price = parseFloat(data.pricePerUnit);
            const variableCost = parseFloat(data.variableCostPerUnit);
            
            const contributionMargin = price - variableCost;
            const breakEvenUnits = fixedCosts / contributionMargin;
            const breakEvenRevenue = breakEvenUnits * price;
            const contributionMarginRatio = (contributionMargin / price) * 100;
            
            return {
                breakEvenUnits: breakEvenUnits,
                breakEvenRevenue: breakEvenRevenue,
                contributionMargin: contributionMargin,
                contributionMarginRatio: contributionMarginRatio,
                fixedCosts: fixedCosts,
                price: price,
                variableCost: variableCost
            };
        }
    },
    
    payback: {
        title: 'Payback Period Calculator',
        description: 'Calculate how long it takes to recover your initial investment',
        fields: [
            { name: 'initialInvestment', label: 'Initial Investment ($)', type: 'number', placeholder: '100000' },
            { name: 'annualCashFlows', label: 'Annual Cash Flows ($)', type: 'textarea', placeholder: '30000, 35000, 40000', help: 'Enter expected cash flows separated by commas' }
        ],
        calculate: function(data) {
            const initialInvestment = parseFloat(data.initialInvestment);
            const cashFlows = data.annualCashFlows.split(',').map(cf => parseFloat(cf.trim()));
            
            let cumulativeCashFlow = 0;
            let paybackPeriod = 0;
            let yearByYearRecovery = [];
            
            for (let i = 0; i < cashFlows.length; i++) {
                cumulativeCashFlow += cashFlows[i];
                yearByYearRecovery.push({
                    year: i + 1,
                    cashFlow: cashFlows[i],
                    cumulative: cumulativeCashFlow
                });
                
                if (cumulativeCashFlow >= initialInvestment && paybackPeriod === 0) {
                    const previousCumulative = cumulativeCashFlow - cashFlows[i];
                    const remainingToRecover = initialInvestment - previousCumulative;
                    const fractionOfYear = remainingToRecover / cashFlows[i];
                    paybackPeriod = i + fractionOfYear;
                }
            }
            
            return {
                paybackPeriod: paybackPeriod,
                totalCashFlows: cumulativeCashFlow,
                initialInvestment: initialInvestment,
                yearByYearRecovery: yearByYearRecovery,
                recovered: cumulativeCashFlow >= initialInvestment
            };
        }
    },
    
    eoq: {
        title: 'Economic Order Quantity (EOQ) Calculator',
        description: 'Optimize inventory ordering to minimize total costs',
        fields: [
            { name: 'annualDemand', label: 'Annual Demand (units)', type: 'number', placeholder: '10000' },
            { name: 'orderingCost', label: 'Ordering Cost per Order ($)', type: 'number', placeholder: '100' },
            { name: 'holdingCost', label: 'Holding Cost per Unit per Year ($)', type: 'number', placeholder: '5' }
        ],
        calculate: function(data) {
            const D = parseFloat(data.annualDemand);
            const S = parseFloat(data.orderingCost);
            const H = parseFloat(data.holdingCost);
            
            const eoq = Math.sqrt((2 * D * S) / H);
            const numberOfOrders = D / eoq;
            const totalOrderingCost = numberOfOrders * S;
            const totalHoldingCost = (eoq / 2) * H;
            const totalCost = totalOrderingCost + totalHoldingCost;
            
            return {
                eoq: eoq,
                numberOfOrders: numberOfOrders,
                totalOrderingCost: totalOrderingCost,
                totalHoldingCost: totalHoldingCost,
                totalCost: totalCost,
                annualDemand: D
            };
        }
    },
    
    cac: {
        title: 'Customer Acquisition Cost (CAC) Calculator',
        description: 'Calculate how much it costs to acquire a new customer',
        fields: [
            { name: 'marketingCosts', label: 'Total Marketing Costs ($)', type: 'number', placeholder: '50000' },
            { name: 'salesCosts', label: 'Total Sales Costs ($)', type: 'number', placeholder: '30000' },
            { name: 'newCustomers', label: 'Number of New Customers', type: 'number', placeholder: '200' }
        ],
        calculate: function(data) {
            const marketing = parseFloat(data.marketingCosts);
            const sales = parseFloat(data.salesCosts);
            const customers = parseFloat(data.newCustomers);
            
            const totalCosts = marketing + sales;
            const cac = totalCosts / customers;
            const marketingShare = (marketing / totalCosts) * 100;
            const salesShare = (sales / totalCosts) * 100;
            
            return {
                cac: cac,
                totalCosts: totalCosts,
                customers: customers,
                marketingCosts: marketing,
                salesCosts: sales,
                marketingShare: marketingShare,
                salesShare: salesShare
            };
        }
    },
    
    ltv: {
        title: 'Customer Lifetime Value (LTV) Calculator',
        description: 'Calculate the total revenue expected from a customer',
        fields: [
            { name: 'averageRevenue', label: 'Average Revenue per Customer per Year ($)', type: 'number', placeholder: '1000' },
            { name: 'customerLifespan', label: 'Average Customer Lifespan (years)', type: 'number', placeholder: '5' },
            { name: 'profitMargin', label: 'Profit Margin (%)', type: 'number', placeholder: '20' }
        ],
        calculate: function(data) {
            const revenue = parseFloat(data.averageRevenue);
            const lifespan = parseFloat(data.customerLifespan);
            const margin = parseFloat(data.profitMargin) / 100;
            
            const totalRevenue = revenue * lifespan;
            const ltv = totalRevenue * margin;
            const monthlyValue = ltv / (lifespan * 12);
            
            return {
                ltv: ltv,
                totalRevenue: totalRevenue,
                lifespan: lifespan,
                monthlyValue: monthlyValue,
                profitMargin: margin * 100
            };
        }
    }
};

// Open calculator modal
function openCalculator(calcType) {
    const modal = document.getElementById('calculatorModal');
    const content = document.getElementById('calculatorContent');
    const resultsSection = document.getElementById('resultsSection');
    
    // Hide results section when opening new calculator
    resultsSection.style.display = 'none';
    
    const template = calculatorTemplates[calcType];
    if (!template) {
        content.innerHTML = '<p>Calculator not found.</p>';
        return;
    }
    
    let formHTML = `
        <h2>${template.title}</h2>
        <p style="color: #666; margin-bottom: 1.5rem;">${template.description}</p>
        <form class="calculator-form" id="calcForm" onsubmit="calculateResult('${calcType}'); return false;">
    `;
    
    template.fields.forEach(field => {
        if (field.type === 'textarea') {
            formHTML += `
                <div class="form-group">
                    <label for="${field.name}">${field.label}</label>
                    <textarea id="${field.name}" name="${field.name}" rows="3" placeholder="${field.placeholder}" required></textarea>
                    ${field.help ? `<small>${field.help}</small>` : ''}
                </div>
            `;
        } else {
            formHTML += `
                <div class="form-group">
                    <label for="${field.name}">${field.label}</label>
                    <input type="${field.type}" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}" step="any" required>
                    ${field.help ? `<small>${field.help}</small>` : ''}
                </div>
            `;
        }
    });
    
    formHTML += `
            <button type="submit" class="btn">Calculate & Generate Insights</button>
        </form>
    `;
    
    content.innerHTML = formHTML;
    modal.style.display = 'block';
}

// Close calculator modal
function closeCalculator() {
    document.getElementById('calculatorModal').style.display = 'none';
}

// Calculate result
function calculateResult(calcType) {
    const form = document.getElementById('calcForm');
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    const template = calculatorTemplates[calcType];
    const results = template.calculate(data);
    
    displayResults(results, calcType, template.title);
    generateChart(results, calcType);
    generateAIInsights(results, calcType, template.title);
}

// Display results
function displayResults(results, calcType, title) {
    const resultsSection = document.getElementById('resultsSection');
    const calculationResults = document.getElementById('calculationResults');
    
    let resultsHTML = '';
    
    // Format results based on calculator type
    switch(calcType) {
        case 'npv':
            resultsHTML = `
                <div class="result-item">
                    <span class="result-label">Net Present Value (NPV):</span>
                    <span class="result-value">$${results.npv.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Decision:</span>
                    <span class="result-value" style="color: ${results.npv > 0 ? '#28a745' : '#dc3545'}">
                        ${results.npv > 0 ? '✓ Accept Project' : '✗ Reject Project'}
                    </span>
                </div>
                <div class="result-item">
                    <span class="result-label">Total PV of Cash Flows:</span>
                    <span class="result-value">$${results.totalPVCashFlows.toFixed(2)}</span>
                </div>
            `;
            break;
        case 'roi':
            resultsHTML = `
                <div class="result-item">
                    <span class="result-label">Total Return:</span>
                    <span class="result-value">$${results.totalReturn.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">ROI:</span>
                    <span class="result-value">${results.roi.toFixed(2)}%</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Annualized ROI:</span>
                    <span class="result-value">${results.annualizedROI.toFixed(2)}%</span>
                </div>
            `;
            break;
        case 'breakeven':
            resultsHTML = `
                <div class="result-item">
                    <span class="result-label">Break-Even Units:</span>
                    <span class="result-value">${Math.ceil(results.breakEvenUnits)} units</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Break-Even Revenue:</span>
                    <span class="result-value">$${results.breakEvenRevenue.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Contribution Margin:</span>
                    <span class="result-value">$${results.contributionMargin.toFixed(2)} per unit</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Contribution Margin Ratio:</span>
                    <span class="result-value">${results.contributionMarginRatio.toFixed(2)}%</span>
                </div>
            `;
            break;
        case 'payback':
            resultsHTML = `
                <div class="result-item">
                    <span class="result-label">Payback Period:</span>
                    <span class="result-value">${results.paybackPeriod.toFixed(2)} years</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Investment Status:</span>
                    <span class="result-value" style="color: ${results.recovered ? '#28a745' : '#ffc107'}">
                        ${results.recovered ? '✓ Fully Recovered' : '⚠ Not Yet Recovered'}
                    </span>
                </div>
            `;
            break;
        case 'eoq':
            resultsHTML = `
                <div class="result-item">
                    <span class="result-label">Economic Order Quantity:</span>
                    <span class="result-value">${Math.round(results.eoq)} units</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Number of Orders per Year:</span>
                    <span class="result-value">${results.numberOfOrders.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Total Annual Cost:</span>
                    <span class="result-value">$${results.totalCost.toFixed(2)}</span>
                </div>
            `;
            break;
        case 'cac':
            resultsHTML = `
                <div class="result-item">
                    <span class="result-label">Customer Acquisition Cost:</span>
                    <span class="result-value">$${results.cac.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Total Acquisition Costs:</span>
                    <span class="result-value">$${results.totalCosts.toFixed(2)}</span>
                </div>
            `;
            break;
        case 'ltv':
            resultsHTML = `
                <div class="result-item">
                    <span class="result-label">Customer Lifetime Value:</span>
                    <span class="result-value">$${results.ltv.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Total Revenue:</span>
                    <span class="result-value">$${results.totalRevenue.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Monthly Value:</span>
                    <span class="result-value">$${results.monthlyValue.toFixed(2)}</span>
                </div>
            `;
            break;
    }
    
    calculationResults.innerHTML = resultsHTML;
    resultsSection.style.display = 'block';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('calculatorModal');
    if (event.target == modal) {
        closeCalculator();
    }
}
