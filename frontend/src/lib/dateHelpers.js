export function expiryLabel(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const diffDays = Math.round((expiry - today) / (1000 * 60 * 60 * 24));
  
    if (diffDays > 1) return { text: `Expires in ${diffDays} days`, cls: diffDays <= 5 ? "badgeWarning" : "badgeSuccess" };
    if (diffDays === 1) return { text: "Expires tomorrow", cls: "badgeWarning" };
    if (diffDays === 0) return { text: "Expires today", cls: "badgeWarning" };
    return { text: `Expired ${Math.abs(diffDays)} days ago`, cls: "badgeDanger" };
  }