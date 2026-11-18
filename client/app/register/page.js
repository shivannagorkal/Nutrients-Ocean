"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import siteData from "@/data/siteData";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/menu";

  const { register } = useCustomerAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alreadyRegisteredNotice, setAlreadyRegisteredNotice] = useState(false);

  // Live Password Checklist: 6+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const hasMinLen = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasNum && hasSpecial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setAlreadyRegisteredNotice(false);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please enter your full name (minimum 2 characters)");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!isPasswordValid) {
      setError(
        "Please meet all password requirements: 6+ characters, uppercase, lowercase, number, and special character."
      );
      return;
    }

    setIsLoading(true);
    try {
      await register(cleanPhone, fullName.trim(), password);
      // Auto logged in -> Navigate to target or /menu
      router.replace(redirectPath);
    } catch (err) {
      if (err.status === 409 || err.code === "ALREADY_REGISTERED") {
        setAlreadyRegisteredNotice(true);
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
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
          maxWidth: "460px",
          backgroundColor: "#FFFFFF",
          borderRadius: "28px",
          padding: "36px 32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
          border: "1px solid #E2E8F0",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
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
            Create Your Account
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>
            Start your fresh daily protein subscription & pass
          </p>
        </div>

        {/* Already Registered Alert */}
        {alreadyRegisteredNotice && (
          <div
            style={{
              padding: "16px",
              borderRadius: "16px",
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              color: "#1E40AF",
              fontSize: "13px",
              marginBottom: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}>
              <AlertCircle size={18} />
              <span>Mobile number is already registered!</span>
            </div>
            <p style={{ margin: 0 }}>
              An account with +91 {phone} already exists. Sign in with your password to access your meals.
            </p>
            <Link
              href={`/login?phone=${encodeURIComponent(phone)}&redirect=${encodeURIComponent(redirectPath)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                backgroundColor: "#1D4ED8",
                color: "#FFFFFF",
                fontWeight: "600",
                fontSize: "13px",
                textDecoration: "none",
                alignSelf: "flex-start",
              }}
            >
              <span>Go to Sign In</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* General Error Alert */}
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Full Name Field */}
          <div>
            <label
              htmlFor="register-name"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Full Name
            </label>
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
              <User size={16} style={{ color: "#64748B", marginRight: "10px", flexShrink: 0 }} />
              <input
                id="register-name"
                type="text"
                placeholder="Enter your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
            </div>
          </div>

          {/* Mobile Number Field */}
          <div>
            <label
              htmlFor="register-phone"
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
                id="register-phone"
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
            <label
              htmlFor="register-password"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
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
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
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

            {/* Password Rules Checklist */}
            <div
              style={{
                marginTop: "10px",
                padding: "10px 12px",
                borderRadius: "12px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                Password Requirements
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                  fontSize: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: hasMinLen ? "#16A34A" : "#94A3B8",
                  }}
                >
                  {hasMinLen ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  <span>6+ characters</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: hasUpper ? "#16A34A" : "#94A3B8",
                  }}
                >
                  {hasUpper ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  <span>1 Capital (A-Z)</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: hasLower ? "#16A34A" : "#94A3B8",
                  }}
                >
                  {hasLower ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  <span>1 Small (a-z)</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: hasNum ? "#16A34A" : "#94A3B8",
                  }}
                >
                  {hasNum ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  <span>1 Number (0-9)</span>
                </div>
                <div
                  style={{
                    gridColumn: "span 2",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: hasSpecial ? "#16A34A" : "#94A3B8",
                  }}
                >
                  {hasSpecial ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  <span>1 Special character (!@#$%^&*)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              isLoading ||
              !fullName.trim() ||
              phone.length < 10 ||
              !isPasswordValid
            }
            style={{
              marginTop: "10px",
              height: "48px",
              borderRadius: "14px",
              backgroundColor:
                fullName.trim() && phone.length === 10 && isPasswordValid
                  ? "#1E6B34"
                  : "#94A3B8",
              color: "#FFFFFF",
              fontSize: "15px",
              fontWeight: "600",
              border: "none",
              cursor:
                fullName.trim() && phone.length === 10 && isPasswordValid && !isLoading
                  ? "pointer"
                  : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(30, 107, 52, 0.25)",
              transition: "background-color 0.2s",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
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
          Already have an account?{" "}
          <Link
            href={`/login${redirectPath !== "/menu" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
            style={{
              color: "#1E6B34",
              fontWeight: "700",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
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
      <RegisterForm />
    </Suspense>
  );
}
