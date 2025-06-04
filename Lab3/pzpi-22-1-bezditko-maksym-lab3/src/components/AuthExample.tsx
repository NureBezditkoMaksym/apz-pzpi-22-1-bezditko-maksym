import React, { useState } from "react";
import { useAuth } from "../hooks/useSupabase";

const AuthExample: React.FC = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          setMessage(`Sign up error: ${error.message}`);
        } else {
          setMessage("Check your email for confirmation link!");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setMessage(`Sign in error: ${error.message}`);
        }
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      setMessage(`Sign out error: ${error.message}`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return (
      <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
        <h2>Welcome!</h2>
        <p>Signed in as: {user.email}</p>
        <button onClick={handleSignOut} style={{ padding: "10px 20px" }}>
          Sign Out
        </button>
        {message && (
          <p style={{ color: "red", marginTop: "10px" }}>{message}</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>{isSignUp ? "Sign Up" : "Sign In"}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", fontSize: "16px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", fontSize: "16px" }}
          />
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            marginBottom: "10px",
          }}
        >
          {isSignUp ? "Sign Up" : "Sign In"}
        </button>
      </form>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        style={{
          width: "100%",
          padding: "10px",
          fontSize: "14px",
          background: "transparent",
          border: "1px solid #ccc",
        }}
      >
        {isSignUp
          ? "Already have an account? Sign In"
          : "Don't have an account? Sign Up"}
      </button>

      {message && <p style={{ color: "red", marginTop: "15px" }}>{message}</p>}
    </div>
  );
};

export default AuthExample;
