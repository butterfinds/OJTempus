# Google OAuth Setup Guide for OJTempus

This guide walks you through setting up Google Sign-In for your Supabase project.

---

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
1. Visit [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account
3. Create a new project or select existing one:
   - Click project dropdown at top
   - Click **"New Project"**
   - Name: `ojtempus-auth`
   - Click **Create**

### 1.2 Enable Google+ API
1. Go to **APIs & Services** → **Library**
2. Search for **"Google+ API"** or **"Google Identity Toolkit API"**
3. Click on it → Click **Enable**

Alternative: Search for **"Google Sign-In"** and enable that API

### 1.3 Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (for any Google user) or **Internal** (for your org only)
3. Click **Create**
4. Fill in app information:
   - **App name:** OJTempus
   - **User support email:** your-email@gmail.com
   - **App logo:** (optional)
   - **Developer contact information:** your-email@gmail.com
5. Click **Save and Continue**
6. On **Scopes** page, click **Add or Remove Scopes**
7. Add these scopes:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
8. Click **Update** → **Save and Continue**
9. On **Test users** page, add your email as a test user
10. Click **Save and Continue** → **Back to Dashboard**

### 1.4 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Fill in details:
   - **Name:** OJTempus Web Client
   - **Authorized JavaScript origins:**
     - `http://localhost:5173` (for local dev)
     - `https://your-production-domain.com` (when deployed)
   - **Authorized redirect URIs:**
     - `https://ksflfwnlivcvgwhzgisq.supabase.co/auth/v1/callback`
     
     **Important:** This is your Supabase callback URL. Get it from:
     - Supabase Dashboard → Authentication → Providers → Google
     - Or use format: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
     
5. Click **Create**
6. **Copy the Client ID and Client Secret** (you'll need these)

---

## Step 2: Configure Google OAuth in Supabase

### 2.1 Add Credentials to Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ksflfwnlivcvgwhzgisq`
3. Go to **Authentication** → **Providers** (left sidebar)
4. Find **Google** and click **Enable**
5. Enter credentials:
   - **Client ID:** (paste from Google Console)
   - **Client Secret:** (paste from Google Console)
   - **Authorized Client IDs:** (leave blank unless using multiple clients)
6. Click **Save**

### 2.2 Configure Site URL (Important!)
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL:**
   - For local: `http://localhost:5173`
   - For production: `https://your-domain.com`
3. Add **Redirect URLs** if needed:
   - `http://localhost:5173`
   - `http://localhost:5173/login`
   - `https://your-domain.com`
4. Click **Save**

---

## Step 3: Email Uniqueness Handling

Good news: **Supabase already handles this automatically!**

When you use `supabase.auth.signUp()` or `supabase.auth.signInWithOAuth()`:

1. **Same email, different providers:**
   - If user signs up with `john@gmail.com` via email+password
   - Then tries Google OAuth with same email
   - **Supabase links them automatically** (same user account)

2. **Email already exists error:**
   - If you try to sign up with an email that already exists
   - Supabase returns: `User already registered`
   - You can catch this and prompt user to log in instead

3. **Recommended flow:**
   - Always use `signUp` for new accounts
   - If it fails with "already exists", suggest "Login instead?"
   - Or use `signInWithPassword` if they confirm they have an account

---

## Step 4: Code Implementation

See the updated `SignupPage.tsx` for:
- Email existence check before signup
- Proper error handling for duplicate emails
- Google OAuth flow with redirect

---

## Testing the Flow

1. **Sign up with email:** Create account with `test@gmail.com`
2. **Try sign up again:** Should get error "User already registered"
3. **Log in instead:** Use `signInWithPassword`
4. **Try Google OAuth:** With same email, should link automatically

## Troubleshooting

**"Redirect URI mismatch" error:**
- Double-check redirect URI in Google Console matches exactly
- Must include `https://...supabase.co/auth/v1/callback`

**"User already registered" on first signup:**
- Check Supabase Auth settings → disable "Enable email confirmations" for testing
- Or confirm email via the link sent

**Google button not working:**
- Check browser console for errors
- Verify Client ID is correct in Supabase
- Check that Google API is enabled in Cloud Console

---

## Security Notes

- Never commit Client Secret to GitHub
- For production, add your production domain to both:
  - Google Console authorized origins
  - Supabase URL Configuration
- Enable "Sign-in with Google" button only on HTTPS in production
