import { getSupabaseClient } from "../supabase";
import { getSupabaseServerClient } from "../supabase-server";
import { toAccount, type Account } from "../types/account";

export type AuthResult = {
  readonly account: Account;
  readonly token: string;
};

function mapRegisterError(message: string): string {
  if (message.toLowerCase().includes("already registered")) {
    return "Email already registered";
  }

  return message;
}

function mapLoginError(message: string): string {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Invalid credentials";
  }

  return message;
}

export async function register(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  const serverSupabase = getSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(mapRegisterError(error.message));
  }

  if (!data.user || !data.session?.access_token) {
    throw new Error("Unable to create account");
  }

  const { data: accountRow, error: accountError } = await serverSupabase
    .from("accounts")
    .insert({
      id: data.user.id,
      email: data.user.email ?? email,
    })
    .select()
    .single();

  if (accountError) {
    throw new Error(accountError.message);
  }

  return {
    token: data.session.access_token,
    account: toAccount(accountRow),
  };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(mapLoginError(error.message));
  }

  if (!data.user || !data.session?.access_token) {
    throw new Error("Invalid credentials");
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("accounts")
    .select()
    .eq("id", data.user.id)
    .single();

  if (accountError) {
    throw new Error(accountError.message);
  }

  return {
    token: data.session.access_token,
    account: toAccount(accountRow),
  };
}

export async function beginGoogleOAuth(
  redirectTo?: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: redirectTo ? { redirectTo } : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.url) {
    throw new Error("Unable to start Google OAuth");
  }

  return data.url;
}

export async function getAccountByAccessToken(
  token: string,
): Promise<Account> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error("Invalid token");
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("accounts")
    .select()
    .eq("id", user.id)
    .single();

  if (accountError) {
    throw new Error(accountError.message);
  }

  return toAccount(accountRow);
}
