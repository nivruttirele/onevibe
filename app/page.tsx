import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>HoodieVision</h1>
      <p style={{ color: "#6b7280", marginBottom: 12 }}>Scan and save 4×4 hoodie patterns.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/login" style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Login</Link>
        <Link href="/scan" style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Scan</Link>
        <Link href="/dashboard" style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Dashboard</Link>
      </div>
    </div>
  );
}
