import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);

  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(''); // user-chosen date

 
  const [filter, setFilter] = useState('ALL');

 
  const [editingExpense, setEditingExpense] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');


  const loadExpenses = async () => {
    const rows = await db.getAllAsync(
      'SELECT * FROM expenses ORDER BY id DESC;'
    );
    setExpenses(rows);
  };

  const addExpense = async () => {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }

    const trimmedCategory = category.trim();
    const trimmedNote = note.trim();
    const trimmedDate = date.trim();

    if (!trimmedCategory) {
      return;
    }

    // Require a date the user typed
    if (!trimmedDate) {
      return;
    }

    // Basic date validation: must be a parsable date string
    if (isNaN(Date.parse(trimmedDate))) {
     
      return;
    }

    await db.runAsync(
      'INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);',
      [amountNumber, trimmedCategory, trimmedNote || null, trimmedDate]
    );

    setAmount('');
    setCategory('');
    setNote('');
    setDate('');

    loadExpenses();
  };

  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    loadExpenses();
  };

  const saveEditedExpense = async () => {
    if (!editingExpense) return;

    const amountNumber = parseFloat(editAmount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }

    const trimmedCategory = editCategory.trim();
    const trimmedNote = editNote.trim();
    const trimmedDate = editDate.trim();

    if (!trimmedCategory || !trimmedDate) {
      return;
    }

    if (isNaN(Date.parse(trimmedDate))) {
      return;
    }

    await db.runAsync(
      'UPDATE expenses SET amount = ?, category = ?, note = ?, date = ? WHERE id = ?;',
      [
        amountNumber,
        trimmedCategory,
        trimmedNote || null,
        trimmedDate,
        editingExpense.id,
      ]
    );

    setEditingExpense(null);
    loadExpenses();
  };

 
  useEffect(() => {
    async function setup() {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          note TEXT,
          date TEXT NOT NULL
        );
      `);

      await loadExpenses();
    }

    setup();
  }, []);

  
  const filteredExpenses = useMemo(() => {
    if (!expenses.length) return [];

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const startOfWeek = new Date(startOfToday);
    // Week starts on Sunday
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    return expenses.filter((exp) => {
      if (!exp.date) return filter === 'ALL';

      const d = new Date(exp.date);

      if (filter === 'ALL') return true;

      if (filter === 'WEEK') {
        return d >= startOfWeek && d < endOfWeek;
      }

      if (filter === 'MONTH') {
        return d >= startOfMonth && d < endOfMonth;
      }

      return true;
    });
  }, [expenses, filter]);


  const overallTotal = useMemo(
    () => filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0),
    [filteredExpenses]
  );

  const totalsByCategory = useMemo(() => {
    const map = {};
    filteredExpenses.forEach((exp) => {
      const key = exp.category || 'Other';
      if (!map[key]) map[key] = 0;
      map[key] += Number(exp.amount || 0);
    });
    return map;
  }, [filteredExpenses]);

  const filterLabel =
    filter === 'ALL'
      ? 'All'
      : filter === 'WEEK'
      ? 'This Week'
      : 'This Month';

 
  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category ?? '');
    setEditNote(expense.note ?? '');
    setEditDate(
      expense.date ?? new Date().toISOString().slice(0, 10)
    );
  };

  
  const renderExpense = ({ item }) => (
    <TouchableOpacity
      style={styles.expenseRow}
      onPress={() => openEditModal(item)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>
          {`$${Number(item.amount).toFixed(2)}`}
        </Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        {item.note ? (
          <Text style={styles.expenseNote}>{item.note}</Text>
        ) : null}
        <Text style={styles.expenseDate}>{item.date}</Text>
      </View>

      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker</Text>

      {/* Filter buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'ALL' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('ALL')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'ALL' && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'WEEK' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('WEEK')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'WEEK' && styles.filterTextActive,
            ]}
          >
            This Week
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'MONTH' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('MONTH')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'MONTH' && styles.filterTextActive,
            ]}
          >
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (Food, Books, Rent...)"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />
        <TextInput
          style={styles.input}
          placeholder="Date (YYYY-MM-DD)"
          placeholderTextColor="#9ca3af"
          value={date}
          onChangeText={setDate}
        />
        <Button title="Add Expense" onPress={addExpense} />
      </View>

      {/* Totals */}
      <View style={styles.totalsContainer}>
        <Text style={styles.totalsHeading}>
          Total Spending ({filterLabel}): ${overallTotal.toFixed(2)}
        </Text>
        <View style={{ marginTop: 4 }}>
          <Text style={styles.totalsSubheading}>By Category:</Text>
          {Object.keys(totalsByCategory).length === 0 ? (
            <Text style={styles.emptyTotals}>No data for this filter.</Text>
          ) : (
            Object.entries(totalsByCategory).map(([cat, total]) => (
              <Text key={cat} style={styles.totalsLine}>
                {cat}: ${total.toFixed(2)}
              </Text>
            ))
          )}
        </View>
      </View>

      {/* Expense list */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses yet for this filter.</Text>
        }
      />

      <Text style={styles.footer}>
        Enter your expenses and they’ll be saved locally with SQLite.
      </Text>

      {/* Edit modal */}
      <Modal
        visible={!!editingExpense}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingExpense(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Edit Expense</Text>

            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Category"
              placeholderTextColor="#9ca3af"
              value={editCategory}
              onChangeText={setEditCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="Note (optional)"
              placeholderTextColor="#9ca3af"
              value={editNote}
              onChangeText={setEditNote}
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#9ca3af"
              value={editDate}
              onChangeText={setEditDate}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                color="#6b7280"
                onPress={() => setEditingExpense(null)}
              />
              <Button title="Save" onPress={saveEditedExpense} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111827' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  form: {
    marginBottom: 16,
    gap: 8,
  },
  input: {
    padding: 10,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 6,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',
  },
  expenseCategory: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  expenseNote: {
    fontSize: 12,
    color: '#9ca3af',
  },
  expenseDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  delete: {
    color: '#f87171',
    fontSize: 20,
    marginLeft: 12,
  },
  empty: {
    color: '#9ca3af',
    marginTop: 24,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 12,
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  totalsContainer: {
    backgroundColor: '#020617',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  totalsHeading: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
  totalsSubheading: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  totalsLine: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  emptyTotals: {
    color: '#9ca3af',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
});
