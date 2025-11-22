export default function AuthHeader({ isRegistrationMode, onSwitchToLogin, onSwitchToRegister }) {
  return (
    <div className="mb-6">
      <h2 className="text-3xl sm:text-4xl font-semibold text-white">
        {isRegistrationMode ? 'Create Your Account' : 'Welcome Back'}
      </h2>

      <div className="mt-2 text-slate-300">
        {isRegistrationMode ? (
          <span className="text-sm">
            Already a member?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-semibold text-sky-300 hover:text-sky-200 underline-offset-4 hover:underline"
            >
              Log in
            </button>
          </span>
        ) : (
          <span className="text-sm">
            New to site?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-semibold text-sky-300 hover:text-sky-200 underline-offset-4 hover:underline"
            >
              Create Account
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
