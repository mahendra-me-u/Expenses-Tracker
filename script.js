// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

// Your web app's Firebase configuration
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

// References
const expensesRef = ref(db, 'expenses');
const form = document.getElementById('expenseForm');
const groupedList = document.getElementById('groupedList');
const totalEl = document.getElementById('total');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const filterCategory = document.getElementById('filterCategory');
const includeExcluded = document.getElementById('includeExcluded'); // New: Toggle ref
const editIdInput = document.getElementById('editId');
const excludeCheckbox = document.getElementById('excludeFromTotal'); // New: Checkbox ref

let editingId = null;
let allExpenses = {}; // Store all expenses for filtering

// Format amount to INR
function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount).replace('₹', '₹'); // Ensure ₹ symbol
}

// Check if expense should be included in totals
function shouldIncludeInTotal(expense) {
    const exclude = expense.excludeFromTotal || false; // Default false for old data
    return !exclude || includeExcluded.checked;
}

// Listen for changes in the database
onValue(expensesRef, (snapshot) => {
    const data = snapshot.val();
    allExpenses = data || {};
    renderExpenses();
});

// Render expenses (filtered, grouped by date, sorted newest first)
function renderExpenses() {
    const filter = filterCategory.value;
    const filteredEntries = Object.entries(allExpenses)
        .filter(([id, expense]) => !filter || expense.category === filter)
        .sort(([id1, exp1], [id2, exp2]) => new Date(exp2.date) - new Date(exp1.date)); // Newest first

    // Group by date
    const grouped = {};
    filteredEntries.forEach(([id, expense]) => {
        const dateKey = expense.date;
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push({ id, ...expense });
    });

    groupedList.innerHTML = '';
    let overallTotal = 0;

    // Render each day group
    Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)).forEach(dateKey => { // Sort dates descending
        const dayExpenses = grouped[dateKey];
        let dayTotal = 0;
        let dayIncludedCount = 0; // For count only included

        // Day header with subtotal (only included expenses)
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = `
            <span>${new Date(dateKey).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${dayExpenses.length} expenses)</span>
            <span>Day Total: ${formatINR(0)}</span> <!-- Placeholder, updated below -->
        `;
        groupedList.appendChild(dayHeader);

        // Expenses for the day
        dayExpenses.forEach(({ id, ...expense }) => {
            const includeInTotal = shouldIncludeInTotal(expense);
            const div = document.createElement('div');
            div.className = `expense-item ${!includeInTotal ? 'excluded' : ''}`;
            div.innerHTML = `
                <div class="details">
                    <strong>${expense.description}</strong> - ${formatINR(expense.amount)}
                    <span class="category">${expense.category}</span> on ${expense.date}
                    ${!includeInTotal ? '<span style="color: #ffc107; font-style: italic;"> (Excluded from totals)</span>' : ''}
                </div>
                <div>
                    <button class="edit-btn" onclick="editExpense('${id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteExpense('${id}')">Delete</button>
                </div>
            `;
            groupedList.appendChild(div);

            if (includeInTotal) {
                dayTotal += parseFloat(expense.amount);
                dayIncludedCount++;
            }
        });

        // Update day header with actual subtotal (only included)
        dayHeader.lastElementChild.textContent = `Day Total: ${formatINR(dayTotal)}`;
        overallTotal += dayTotal;
    });

    // Overall total (only included)
    totalEl.innerHTML = `Overall Total: ${formatINR(overallTotal)}`;
    totalEl.classList.toggle('warning', overallTotal > 100000); // Warning over ₹1,00,000
}

// Add or update expense
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const excludeFromTotal = excludeCheckbox.checked; // New: Capture checkbox

    if (amount <= 0) {
        alert('Amount must be positive!');
        return;
    }

    const expenseData = {
        description,
        amount,
        category,
        date,
        excludeFromTotal // New: Save to Firebase
    };

    if (editingId) {
        // Update existing
        update(ref(db, `expenses/${editingId}`), expenseData);
        editingId = null;
        submitBtn.textContent = 'Add Expense';
        cancelBtn.style.display = 'none';
        editIdInput.value = '';
    } else {
        // Add new
        push(expensesRef, expenseData);
    }

    form.reset();
    excludeCheckbox.checked = false; // Reset checkbox
});

// Cancel edit
cancelBtn.addEventListener('click', () => {
    editingId = null;
    submitBtn.textContent = 'Add Expense';
    cancelBtn.style.display = 'none';
    editIdInput.value = '';
    form.reset();
    excludeCheckbox.checked = false; // New: Reset checkbox
});

// Edit expense
window.editExpense = (id) => {
    const expense = allExpenses[id];
    if (expense) {
        document.getElementById('description').value = expense.description;
        document.getElementById('amount').value = expense.amount;
        document.getElementById('category').value = expense.category;
        document.getElementById('date').value = expense.date;
        excludeCheckbox.checked = expense.excludeFromTotal || false; // New: Pre-populate checkbox
        editingId = id;
        editIdInput.value = id;
        submitBtn.textContent = 'Update Expense';
        cancelBtn.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
    }
};

// Delete expense
window.deleteExpense = (id) => {
    if (confirm('Are you sure you want to delete this expense?')) {
        remove(ref(db, `expenses/${id}`));
    }
};

// Filter change
filterCategory.addEventListener('change', renderExpenses);

// New: Toggle change listener
includeExcluded.addEventListener('change', renderExpenses);

// Set default date to today
document.getElementById('date').valueAsDate = new Date();
