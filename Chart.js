function updateChart(expenses) {

    const monthly = {};

    expenses.forEach(exp => {
        const month = exp.date.substring(0, 7);

        if (!monthly[month]) monthly[month] = 0;

        monthly[month] += parseFloat(exp.amount);
    });

    new Chart(document.getElementById("expenseChart"), {
        type: "bar",
        data: {
            labels: Object.keys(monthly),
            datasets: [{
                label: "Monthly Expenses",
                data: Object.values(monthly)
            }]
        }
    });

}
