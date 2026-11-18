"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, Sparkles } from "lucide-react";
import siteData from "@/data/siteData";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/menu";
  const initialPhone = searchParams.get("phone") || "";

  const { login } = useCustomerAuth();

  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsLoading(true);
    try {
      await login(cleanPhone, password);
      // Successful login -> Navigate to target or /menu
      router.replace(redirectPath);
    } catch (err) {
      setError(err.message || "Invalid mobile number or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F8FBF6",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#FFFFFF",
          borderRadius: "28px",
          padding: "36px 32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
          border: "1px solid #E2E8F0",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              marginBottom: "16px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={siteData.brand.logo}
              alt={siteData.brand.name}
              width={42}
              height={42}
              style={{ objectFit: "contain" }}
            />
            <span
              style={{
                fontSize: "20px",
                fontWeight: "800",
                color: "#1E6B34",
                letterSpacing: "-0.01em",
              }}
            >
              {siteData.brand.name}
            </span>
          </Link>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: "6px",
            }}
          >
            Welcome Back
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>
            Sign in to manage your daily protein pass & meals
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 14px",
              borderRadius: "14px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              fontSize: "13px",
              marginBottom: "20px",
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Mobile Number Field */}
          <div>
            <label
              htmlFor="login-phone"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Mobile Number
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1.5px solid #CBD5E1",
                borderRadius: "14px",
                padding: "0 14px",
                backgroundColor: "#F8FAFC",
                transition: "border-color 0.2s, background-color 0.2s",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#64748B",
                  paddingRight: "10px",
                  borderRight: "1px solid #CBD5E1",
                  marginRight: "10px",
                  userSelect: "none",
                }}
              >
                +91
              </span>
              <input
                id="login-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) setPhone(val);
                }}
                required
                style={{
                  width: "100%",
                  height: "46px",
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  fontSize: "15px",
                  fontWeight: "500",
                  color: "#0F172A",
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <label
                htmlFor="login-password"
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#334155",
                }}
              >
                Password
              </label>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1.5px solid #CBD5E1",
                borderRadius: "14px",
                padding: "0 14px",
                backgroundColor: "#F8FAFC",
              }}
            >
              <Lock size={16} style={{ color: "#64748B", marginRight: "10px", flexShrink: 0 }} />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: "46px",
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  fontSize: "15px",
                  color: "#0F172A",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748B",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || phone.length < 10 || !password}
            style={{
              marginTop: "8px",
              height: "48px",
              borderRadius: "14px",
              backgroundColor: phone.length === 10 && password ? "#1E6B34" : "#94A3B8",
              color: "#FFFFFF",
              fontSize: "15px",
              fontWeight: "600",
              border: "none",
              cursor: phone.length === 10 && password && !isLoading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(30, 107, 52, 0.25)",
              transition: "background-color 0.2s, transform 0.1s",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid #F1F5F9",
            textAlign: "center",
            fontSize: "14px",
            color: "#64748B",
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href={`/register${redirectPath !== "/menu" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
            style={{
              color: "#1E6B34",
              fontWeight: "700",
              textDecoration: "none",
            }}
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F8FBF6",
          }}
        >
          <Loader2 size={32} className="spin" style={{ color: "#1E6B34" }} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
