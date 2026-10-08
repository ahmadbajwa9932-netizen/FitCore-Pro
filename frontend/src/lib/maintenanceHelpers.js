export function maintenanceDueLabel(nextDueDate) {
    if (!nextDueDate) return { text: "—", cls: null };
  
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(nextDueDate);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
  
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days`, cls: "badgeDanger" };
    if (diffDays === 0) return { text: "Due today", cls: "badgeWarning" };
    if (diffDays <= 7) return { text: `Due in ${diffDays} days`, cls: "badgeWarning" };
    return { text: due.toISOString().slice(0, 10), cls: null };
  }