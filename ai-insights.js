// AI-powered insights generation for calculator results
function generateAIInsights(results, calcType, title) {
    const insightsContainer = document.getElementById('aiInsights');
    let insights = '';
    
    switch(calcType) {
        case 'npv':
            insights = generateNPVInsights(results);
            break;
        case 'roi':
            insights = generateROIInsights(results);
            break;
        case 'breakeven':
            insights = generateBreakEvenInsights(results);
            break;
        case 'payback':
            insights = generatePaybackInsights(results);
            break;
        case 'eoq':
            insights = generateEOQInsights(results);
            break;
        case 'cac':
            insights = generateCACInsights(results);
            break;
        case 'ltv':
            insights = generateLTVInsights(results);
            break;
    }
    
    insightsContainer.innerHTML = `
        <h4>AI-Powered Insights</h4>
        ${insights}
    `;
}

function generateNPVInsights(results) {
    const decision = results.npv > 0 ? 'positive' : 'negative';
    const percentage = ((results.npv / results.initialInvestment) * 100).toFixed(2);
    
    let insights = `<p><strong>Investment Decision:</strong> `;
    
    if (results.npv > 0) {
        insights += `This project has a <strong>positive NPV of $${results.npv.toFixed(2)}</strong>, indicating it will create value equal to ${Math.abs(percentage)}% of your initial investment. This means the project is expected to generate returns above your required rate of return of ${(results.discountRate * 100).toFixed(2)}%.`;
    } else {
        insights += `This project has a <strong>negative NPV of $${results.npv.toFixed(2)}</strong>, suggesting it will destroy ${Math.abs(percentage)}% of your investment value. The project's returns don't meet your required rate of return of ${(results.discountRate * 100).toFixed(2)}%.`;
    }
    
    insights += `</p>`;
    
    insights += `<p><strong>Key Considerations:</strong> The total present value of your future cash flows is $${results.totalPVCashFlows.toFixed(2)}. `;
    
    if (results.npv > 0) {
        insights += `Consider this project a strong candidate for investment, but also evaluate non-financial factors like strategic fit, risk profile, and resource availability.`;
    } else {
        insights += `You might want to negotiate better terms, reduce initial costs, or look for alternative investments with higher returns.`;
    }
    
    insights += `</p>`;
    
    insights += `<p><strong>Sensitivity Analysis:</strong> Your NPV is sensitive to the discount rate. A 1% change in the discount rate could significantly impact the project's viability. Consider running multiple scenarios with different discount rates to understand the risk.`;
    
    insights += `</p>`;
    
    return insights;
}

function generateROIInsights(results) {
    let insights = `<p><strong>Return Performance:</strong> `;
    
    insights += `Your investment generated a total return of $${results.totalReturn.toFixed(2)}, which represents a ${results.roi.toFixed(2)}% return on your initial investment of $${results.initial.toFixed(2)}.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Annualized Perspective:</strong> `;
    
    insights += `On an annualized basis, your ROI is ${results.annualizedROI.toFixed(2)}% over ${results.years} years. `;
    
    if (results.annualizedROI > 10) {
        insights += `This is an excellent return, significantly outperforming typical market benchmarks (S&P 500 averages ~10% annually).`;
    } else if (results.annualizedROI > 5) {
        insights += `This is a solid return, competitive with traditional investment benchmarks.`;
    } else if (results.annualizedROI > 0) {
        insights += `This is a modest positive return. Consider whether this meets your investment objectives given the risk and time commitment.`;
    } else {
        insights += `This represents a loss. Analyze what went wrong and consider whether to exit or restructure the investment.`;
    }
    
    insights += `</p>`;
    
    insights += `<p><strong>Benchmarking:</strong> Compare this ${results.annualizedROI.toFixed(2)}% return against alternative investment opportunities with similar risk profiles. Also factor in inflation - real returns are what matter for purchasing power.`;
    
    insights += `</p>`;
    
    return insights;
}

function generateBreakEvenInsights(results) {
    let insights = `<p><strong>Break-Even Point:</strong> `;
    
    insights += `You need to sell <strong>${Math.ceil(results.breakEvenUnits)} units</strong> to cover all your costs. This translates to $${results.breakEvenRevenue.toFixed(2)} in revenue. Every unit sold beyond this point contributes $${results.contributionMargin.toFixed(2)} directly to profit.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Contribution Margin Analysis:</strong> `;
    
    insights += `Your contribution margin ratio is ${results.contributionMarginRatio.toFixed(2)}%, meaning ${results.contributionMarginRatio.toFixed(2)}% of each sales dollar contributes to covering fixed costs and generating profit. `;
    
    if (results.contributionMarginRatio > 50) {
        insights += `This is a healthy margin, giving you good pricing power and profitability potential.`;
    } else if (results.contributionMarginRatio > 30) {
        insights += `This is a reasonable margin, but there may be room to improve through cost reduction or price optimization.`;
    } else {
        insights += `This is a thin margin. Consider strategies to reduce variable costs or increase prices to improve profitability.`;
    }
    
    insights += `</p>`;
    
    insights += `<p><strong>Strategic Recommendations:</strong> `;
    
    const safetyMargin = 20;
    const targetUnits = Math.ceil(results.breakEvenUnits * (1 + safetyMargin/100));
    
    insights += `To maintain a healthy safety margin, aim to sell at least ${targetUnits} units (${safetyMargin}% above break-even). Monitor your fixed costs closely and explore ways to increase your contribution margin through operational efficiency or value-added features that justify premium pricing.`;
    
    insights += `</p>`;
    
    return insights;
}

function generatePaybackInsights(results) {
    let insights = `<p><strong>Recovery Timeline:</strong> `;
    
    if (results.paybackPeriod > 0) {
        const years = Math.floor(results.paybackPeriod);
        const months = Math.round((results.paybackPeriod - years) * 12);
        
        insights += `You will recover your initial investment of $${results.initialInvestment.toFixed(2)} in approximately <strong>${years} years and ${months} months</strong>. `;
        
        if (results.paybackPeriod <= 2) {
            insights += `This is an excellent payback period, indicating quick capital recovery and lower risk.`;
        } else if (results.paybackPeriod <= 4) {
            insights += `This is a reasonable payback period for most business investments.`;
        } else {
            insights += `This is a longer payback period. Ensure the investment aligns with your strategic goals and risk tolerance.`;
        }
    } else {
        insights += `Based on the provided cash flows, you haven't recovered your initial investment yet. You may need additional years of cash flows or higher annual returns.`;
    }
    
    insights += `</p>`;
    
    insights += `<p><strong>Cash Flow Health:</strong> `;
    
    insights += `Your cumulative cash flows total $${results.totalCashFlows.toFixed(2)}. `;
    
    if (results.recovered) {
        const surplus = results.totalCashFlows - results.initialInvestment;
        insights += `You've not only recovered your investment but generated an additional $${surplus.toFixed(2)} in positive cash flow.`;
    } else {
        const shortfall = results.initialInvestment - results.totalCashFlows;
        insights += `You still need $${shortfall.toFixed(2)} in additional cash flows to fully recover your investment.`;
    }
    
    insights += `</p>`;
    
    insights += `<p><strong>Risk Assessment:</strong> The payback period is a simple but useful metric for assessing investment risk. Shorter payback periods generally indicate lower risk. However, remember that this method doesn't account for the time value of money or cash flows beyond the payback period. Consider using NPV for a more comprehensive analysis.`;
    
    insights += `</p>`;
    
    return insights;
}

function generateEOQInsights(results) {
    let insights = `<p><strong>Optimal Order Quantity:</strong> `;
    
    insights += `Your Economic Order Quantity is <strong>${Math.round(results.eoq)} units</strong>. By ordering this quantity each time, you'll minimize your total inventory costs while meeting your annual demand of ${results.annualDemand.toLocaleString()} units.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Order Frequency:</strong> `;
    
    insights += `You should place approximately ${results.numberOfOrders.toFixed(2)} orders per year, or about one order every ${(12 / results.numberOfOrders).toFixed(1)} months. This balances the cost of placing orders against the cost of holding inventory.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Cost Breakdown:</strong> `;
    
    insights += `Your total annual inventory cost will be $${results.totalCost.toFixed(2)}, split between ordering costs ($${results.totalOrderingCost.toFixed(2)}) and holding costs ($${results.totalHoldingCost.toFixed(2)}). At the EOQ point, these two costs are perfectly balanced.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Implementation Tips:</strong> Consider quantity discounts from suppliers, storage capacity constraints, and product shelf life. If suppliers offer significant discounts for larger orders, it might be worth deviating from the EOQ. Also, review your assumptions regularly as demand patterns and costs change.`;
    
    insights += `</p>`;
    
    return insights;
}

function generateCACInsights(results) {
    let insights = `<p><strong>Acquisition Cost:</strong> `;
    
    insights += `You're spending <strong>$${results.cac.toFixed(2)}</strong> to acquire each new customer. This is based on total acquisition costs of $${results.totalCosts.toFixed(2)} to acquire ${results.customers} customers.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Cost Distribution:</strong> `;
    
    insights += `Your acquisition costs are split between marketing (${results.marketingShare.toFixed(1)}%) and sales (${results.salesShare.toFixed(1)}%). `;
    
    if (results.marketingShare > 60) {
        insights += `You're heavily marketing-driven. Consider optimizing your marketing channels and improving conversion rates.`;
    } else if (results.salesShare > 60) {
        insights += `You're sales-driven with high sales costs. Look for ways to automate or improve sales efficiency.`;
    } else {
        insights += `You have a balanced approach between marketing and sales.`;
    }
    
    insights += `</p>`;
    
    insights += `<p><strong>Profitability Benchmark:</strong> `;
    
    insights += `For sustainable growth, your CAC should typically be 3-5 times lower than your Customer Lifetime Value (LTV). If your CAC is $${results.cac.toFixed(2)}, your target LTV should be at least $${(results.cac * 3).toFixed(2)} to ensure profitable customer relationships.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Optimization Strategies:</strong> Focus on improving conversion rates, optimizing marketing channel mix, leveraging referrals and word-of-mouth, and improving customer targeting to reduce wasted spend. Track CAC by channel to identify the most efficient acquisition sources.`;
    
    insights += `</p>`;
    
    return insights;
}

function generateLTVInsights(results) {
    let insights = `<p><strong>Customer Value:</strong> `;
    
    insights += `Each customer is worth <strong>$${results.ltv.toFixed(2)}</strong> in profit over their lifetime. This is based on ${results.lifespan} years of relationship generating $${results.totalRevenue.toFixed(2)} in total revenue at a ${results.profitMargin.toFixed(0)}% profit margin.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Monthly Breakdown:</strong> `;
    
    insights += `On a monthly basis, each customer contributes approximately $${results.monthlyValue.toFixed(2)} in value. This helps you understand the ongoing value stream and set appropriate retention budgets.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>LTV:CAC Ratio:</strong> `;
    
    insights += `A healthy business typically has an LTV:CAC ratio of 3:1 or higher. If your LTV is $${results.ltv.toFixed(2)}, your customer acquisition cost should ideally be under $${(results.ltv / 3).toFixed(2)} to maintain profitable growth.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Growth Strategies:</strong> `;
    
    insights += `To increase LTV, focus on: (1) Extending customer lifespan through retention programs, (2) Increasing average revenue through upselling and cross-selling, and (3) Improving profit margins through operational efficiency. Even a 10% improvement in any of these factors can significantly boost your LTV.`;
    
    insights += `</p>`;
    
    insights += `<p><strong>Important Note:</strong> These calculations assume consistent revenue and retention. In reality, customer behavior varies. Consider segmenting customers and calculating LTV for different cohorts to get more accurate insights.`;
    
    insights += `</p>`;
    
    return insights;
}
