"use client";

import { useState, useEffect } from "react";

export default function CountertopCRM() {
  const [jobs, setJobs] = useState([]);
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("jobs");
    if (stored) setJobs(JSON.parse(stored));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("jobs", JSON.stringify(jobs));
  }, [jobs]);

  const addJob = () => {
    if (!customer || !amount) return;

    const newJob = {
      id: Date.now(),
      customer,
      amount: Number(amount),
    };

    setJobs([...jobs, newJob]);
    setCustomer("");
    setAmount("");
  };

  const deleteJob = (id) => {
    setJobs(jobs.filter((j) => j.id !== id));
  };

  const total = jobs.reduce((sum, j) => sum + j.amount, 0);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Countertop CRM</h1>

      {/* INPUTS */}
      <div style={styles.inputRow}>
        <input
          placeholder="Customer Name"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Quote Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={styles.input}
        />

        <button onClick={addJob} style={styles.button}>
          Add
        </button>
      </div>

      {/* JOB LIST */}
      <div>
        {jobs.length === 0 && <p>No jobs yet</p>}

        {jobs.map((job) => (
          <div key={job.id} style={styles.card}>
            <div>
              <strong>{job.customer}</strong>
              <div>${job.amount.toLocaleString()}</div>
            </div>

            <button
              onClick={() => deleteJob(job.id)}
              style={styles.delete}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* TOTAL */}
      <h2 style={styles.total}>
        Total Pipeline: ${total.toLocaleString()}
      </h2>
    </div>
  );
}

/* STYLES */
const styles = {
  container: {
    padding: 20,
    maxWidth: 600,
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    marginBottom: 20,
  },
  inputRow: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px 16px",
    borderRadius: 6,
    border: "none",
    background: "black",
    color: "white",
    cursor: "pointer",
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 8,
    marginBottom: 10,
  },
  delete: {
    background: "red",
    color: "white",
    border: "none",
    borderRadius: 6,
    padding: "6px 10px",
    cursor: "pointer",
  },
  total: {
    marginTop: 20,
  },
};