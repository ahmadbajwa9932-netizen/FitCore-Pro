"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

export default function EmailInput({ value, onChange, placeholder = "you@example.com", required = false }) {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    api.getKnownEmails().then((res) => setEmails(res.emails || [])).catch(() => setEmails([]));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = emails.filter((e) => e.toLowerCase().includes(value.toLowerCase()));

  return (
    <div className="emailInputWrap" ref={wrapperRef}>
      <input
        type="email"
        className="formInput"
        required={required}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {emails.length > 0 && (
        <button type="button" className="emailDropdownToggle" onClick={() => setOpen((o) => !o)}>
          <ChevronDown size={16} />
        </button>
      )}
      {open && filtered.length > 0 && (
        <div className="emailDropdownList">
          {filtered.map((email) => (
            <div
              key={email}
              className="emailDropdownItem"
              onClick={() => { onChange(email); setOpen(false); }}
            >
              {email}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}