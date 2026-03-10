// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAR8V6aQGy0mzg5DtgToqtVbv7w-wR724o",
    authDomain: "expenses-tracker-50131.firebaseapp.com",
    databaseURL: "https://expenses-tracker-50131-default-rtdb.firebaseio.com",
    projectId: "expenses-tracker-50131",
    storageBucket: "expenses-tracker-50131.firebasestorage.app",
    messagingSenderId: "339264912432",
    appId: "1:339264912432:web:0099f196b3b03f84cb81f5",
    measurementId: "G-QEBCHXY4EV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// UI references
const form = document.getElementById('expenseForm');
const groupedList = document.getElementById('groupedList');
const totalEl = document.getElementById('total');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const filterCategory = document.getElementById('filterCategory');
const includeExcluded = document.getElementById('includeExcluded');
const editIdInput = document.getElementById('editId');
const excludeCheckbox = document.getElementById('excludeFromTotal');

const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");

let expensesRef;
let editingId = null;
let allExpenses = {};
let expenseChart;

// LOGIN
googleLoginBtn.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert(error.message);
    }
});

// LOGOUT
logoutBtn.addEventListener("click", () => {
    signOut(auth);
});

// AUTH STATE
onAuthStateChanged(auth, (user) => {

    const userEmail = document.getElementById("userEmail");

    if (user) {

        loginScreen.style.display = "none";
        appContainer.style.display = "block";

        userEmail.textContent = user.email;

        expensesRef = ref(db, 'users/' + user.uid + '/expenses');

        onValue(expensesRef, (snapshot) => {
            const data = snapshot.val();
            allExpenses = data || {};
            renderExpenses();
        });

    } else {

        loginScreen.style.display = "flex";
        appContainer.style.display = "none";

    }

});

// FORMAT INR
function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

// TOTAL INCLUDE CHECK
function shouldIncludeInTotal(expense) {
    const exclude = expense.excludeFromTotal || false;
    return !exclude || includeExcluded.checked;
}

// RENDER EXPENSES
function renderExpenses() {

    const filter = filterCategory.value;

    const filteredEntries = Object.entries(allExpenses)
        .filter(([id, expense]) => !filter || expense.category === filter)
        .sort(([id1, exp1], [id2, exp2]) => new Date(exp2.date) - new Date(exp1.date));

    const grouped = {};

    filteredEntries.forEach(([id, expense]) => {

        const dateKey = expense.date;

        if (!grouped[dateKey]) grouped[dateKey] = [];

        grouped[dateKey].push({ id, ...expense });

    });

    groupedList.innerHTML = '';

    let overallTotal = 0;

    Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)).forEach(dateKey => {

        const dayExpenses = grouped[dateKey];

        let dayTotal = 0;

        const dayHeader = document.createElement('div');

        dayHeader.className = 'day-header';

        dayHeader.innerHTML = `
        <span>${new Date(dateKey).toLocaleDateString('en-IN')}</span>
        <span>Day Total: ${formatINR(0)}</span>
        `;

        groupedList.appendChild(dayHeader);

        dayExpenses.forEach(({ id, ...expense }) => {

            const includeInTotal = shouldIncludeInTotal(expense);

            const div = document.createElement('div');

            div.className = `expense-item ${!includeInTotal ? 'excluded' : ''}`;

            div.innerHTML = `
            <div class="details">
            <strong>${expense.description}</strong>
            - ${formatINR(expense.amount)}
            <span class="category">${expense.category}</span>
            </div>
            <div>
            <button onclick="editExpense('${id}')">Edit</button>
            <button onclick="deleteExpense('${id}')">Delete</button>
            </div>
            `;

            groupedList.appendChild(div);

            if (includeInTotal) {

                dayTotal += Number(expense.amount);

            }

        });

        dayHeader.lastElementChild.textContent =
            `Day Total: ${formatINR(dayTotal)}`;

        overallTotal += dayTotal;

    });

    totalEl.innerHTML = `Overall Total: ${formatINR(overallTotal)}`;

    document.getElementById("totalExpenses").textContent = formatINR(overallTotal);
    document.getElementById("transactionCount").textContent = filteredEntries.length;

    renderChart();

}

// CHART
function renderChart() {

    const monthly = {};

    Object.values(allExpenses).forEach(e => {

        const month = new Date(e.date).toLocaleString('default', {
            month: 'short',
            year: 'numeric'
        });

        if (!monthly[month]) monthly[month] = 0;

        if (!e.excludeFromTotal) {

            monthly[month] += Number(e.amount);

        }

    });

    const labels = Object.keys(monthly);
    const data = Object.values(monthly);

    const ctx = document.getElementById("expenseChart");

    if (expenseChart) expenseChart.destroy();

    expenseChart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: labels,

            datasets: [{

                label: "Monthly Expenses",

                data: data

            }]

        }

    });

}

// ADD / UPDATE
form.addEventListener('submit', (e) => {

    e.preventDefault();

    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    const excludeFromTotal = excludeCheckbox.checked;

    const expenseData = {
        description,
        amount,
        category,
        date,
        excludeFromTotal
    };

    if (editingId) {

        update(ref(db, `users/${auth.currentUser.uid}/expenses/${editingId}`), expenseData);

        editingId = null;

        submitBtn.textContent = "Add Expense";

    } else {

        push(expensesRef, expenseData);

    }

    form.reset();

});

// EDIT
window.editExpense = (id) => {

    const expense = allExpenses[id];

    document.getElementById('description').value = expense.description;
    document.getElementById('amount').value = expense.amount;
    document.getElementById('category').value = expense.category;
    document.getElementById('date').value = expense.date;

    excludeCheckbox.checked = expense.excludeFromTotal || false;

    editingId = id;

};

// DELETE
window.deleteExpense = (id) => {

    if (confirm("Delete this expense?")) {

        remove(ref(db, `users/${auth.currentUser.uid}/expenses/${id}`));

    }

};

// FILTER
filterCategory.addEventListener('change', renderExpenses);
includeExcluded.addEventListener('change', renderExpenses);

// EXPORT EXCEL
document.getElementById("exportExcelBtn").addEventListener("click", () => {

    const rows = [];

    Object.values(allExpenses).forEach(exp => {

        rows.push({
            Description: exp.description,
            Amount: exp.amount,
            Category: exp.category,
            Date: exp.date,
            Excluded: exp.excludeFromTotal ? "Yes" : "No"
        });

    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

    XLSX.writeFile(workbook, "expenses.xlsx");

});

// Default date
document.getElementById('date').valueAsDate = new Date();
