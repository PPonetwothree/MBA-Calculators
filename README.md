# 📊 MBA Calculator Hub

**Your Complete Business Analytics Toolkit**

A comprehensive web application designed specifically for MBA students to solve numerical problems across Finance, Operations, Marketing, and Statistics - all with AI-powered insights and data visualization.

![Project Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎯 Project Overview

MBA Calculator Hub is a single-page web application that consolidates 15+ essential business calculators into one accessible platform. Each calculator not only performs accurate computations but also generates intelligent insights and visual representations to help users understand and interpret their results.

**Live Demo:** [Your Netlify URL will go here]

## ✨ Features

### Core Functionality
- **15+ Professional Calculators** covering key MBA disciplines
- **AI-Powered Insights** providing contextual analysis of results
- **Dynamic Data Visualization** using Chart.js for instant graphical representations
- **Responsive Design** works seamlessly on desktop, tablet, and mobile
- **User-Friendly Interface** with intuitive forms and clear result displays

### Calculator Categories

#### 💰 Finance & Investment
1. **NPV Calculator** - Net Present Value analysis for investment decisions
2. **IRR Calculator** - Internal Rate of Return computation
3. **ROI Calculator** - Return on Investment with annualized returns
4. **Payback Period** - Investment recovery timeline analysis
5. **Break-Even Analysis** - Calculate break-even points and contribution margins

#### ⚙️ Operations Management
6. **EOQ Calculator** - Economic Order Quantity for inventory optimization
7. **Inventory Turnover** - Measure inventory efficiency

#### 📈 Marketing & Sales
8. **CAC Calculator** - Customer Acquisition Cost analysis
9. **LTV Calculator** - Customer Lifetime Value estimation

#### 📊 Statistics & Analytics
10. **Linear Regression** - Trend analysis and forecasting
11. **Correlation Analysis** - Measure variable relationships

*...with more calculators in development!*

## 🛠️ Technologies Used

- **HTML5** - Semantic markup structure
- **CSS3** - Modern styling with gradients, flexbox, and grid
- **Vanilla JavaScript** - Core functionality and calculations
- **Chart.js** - Data visualization library
- **Netlify** - Deployment and hosting platform

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Basic understanding of business concepts (for using the calculators)

### Installation & Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mba-calculator-hub.git
   cd mba-calculator-hub
   ```

2. **Open locally**
   Simply open `index.html` in your web browser, or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```

3. **Access the app**
   Navigate to `http://localhost:8000` in your browser

### Deployment to Netlify

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/mba-calculator-hub.git
   git push -u origin main
   ```

2. **Deploy on Netlify**
   - Log in to [Netlify](https://www.netlify.com/)
   - Click "New site from Git"
   - Choose your repository
   - Deploy! (No build settings needed)

## 📖 How to Use

1. **Select a Calculator** - Click on any calculator card from the home page
2. **Enter Your Data** - Fill in the required fields in the form
3. **Calculate** - Click the "Calculate & Generate Insights" button
4. **Review Results** - View your numerical results, AI insights, and charts
5. **Interpret** - Use the AI-generated insights to understand implications

### Example Use Case: NPV Calculator

**Scenario:** You're evaluating a $100,000 investment that will generate cash flows over 5 years.

1. Enter Initial Investment: `100000`
2. Enter Discount Rate: `10`
3. Enter Cash Flows: `30000, 35000, 40000, 45000, 50000`
4. Click Calculate
5. Review:
   - NPV result (positive = good investment)
   - Chart showing cash flows vs present values
   - AI insights about risk, sensitivity, and recommendations

## 🏗️ Project Structure

```
mba-calculator-hub/
│
├── index.html              # Main HTML structure
├── styles.css              # All styling and responsive design
├── app.js                  # Core app logic and modal management
├── calculators.js          # Chart generation for visualizations
├── ai-insights.js          # AI insight generation for each calculator
├── README.md               # Project documentation
└── netlify.toml           # Netlify configuration (optional)
```

## 🔧 Customization

### Adding a New Calculator

1. **Define Calculator Template** (in `app.js`):
   ```javascript
   calculatorTemplates['newcalc'] = {
       title: 'Your Calculator Name',
       description: 'Brief description',
       fields: [
           { name: 'field1', label: 'Field Label', type: 'number', placeholder: '0' }
       ],
       calculate: function(data) {
           // Your calculation logic
           return results;
       }
   };
   ```

2. **Add Card to Homepage** (in `index.html`):
   ```html
   <div class="calc-card" onclick="openCalculator('newcalc')">
       <h4>Your Calculator</h4>
       <p>Description</p>
   </div>
   ```

3. **Create Visualization** (in `calculators.js`)
4. **Generate Insights** (in `ai-insights.js`)

## 📊 Example Results

### Break-Even Analysis
- **Input:** Fixed Costs: $50,000 | Price: $100 | Variable Cost: $60
- **Output:** 
  - Break-even units: 1,250 units
  - Break-even revenue: $125,000
  - Contribution margin: $40/unit
  - Visual chart showing revenue vs costs

### ROI Calculator
- **Input:** Investment: $50,000 | Final Value: $75,000 | Time: 3 years
- **Output:**
  - Total Return: $25,000
  - ROI: 50%
  - Annualized ROI: 14.47%
  - Doughnut chart showing breakdown

## 🎓 Educational Value

This project demonstrates:
- **Business Acumen** - Understanding of core MBA concepts
- **Web Development** - HTML, CSS, JavaScript proficiency
- **User Experience Design** - Intuitive interfaces and data visualization
- **Problem-Solving** - Translating complex formulas into code
- **Project Management** - Structured development and deployment

## 🔮 Future Enhancements

- [ ] Add more calculators (regression, correlation, financial ratios)
- [ ] Implement data export (PDF/Excel)
- [ ] Add user accounts and calculation history
- [ ] Integrate actual AI API for more sophisticated insights
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Advanced scenario modeling
- [ ] Comparison tools (multiple calculations side-by-side)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)
- Email: your.email@example.com

## 🙏 Acknowledgments

- Chart.js for excellent visualization library
- MBA curriculum for inspiring calculator selection
- The web development community for best practices

## 📞 Contact & Support

Questions? Suggestions? Found a bug?
- Open an issue on GitHub
- Email: your.email@example.com
- Project Link: [https://github.com/yourusername/mba-calculator-hub](https://github.com/yourusername/mba-calculator-hub)

---

**Made with ❤️ for MBA Students Everywhere**

*Last Updated: January 2025*
