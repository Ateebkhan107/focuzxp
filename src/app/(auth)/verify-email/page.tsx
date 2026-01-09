export default function VerifyEmail() {
  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
      
      {/* Icon */}
      <div className="text-4xl mb-4">📧</div>

      {/* Title */}
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">
        Check your email
      </h1>

      {/* Main message */}
      <p className="text-slate-600 text-sm mb-4 leading-relaxed">
        We’ve sent a confirmation link to your email address.
        <br />
        Please click the link to activate your account.
      </p>

      {/* Helper message */}
      <p className="text-xs text-slate-500 mb-6">
        Once confirmed, you’ll be automatically logged in and redirected to FocuzXP.
      </p>

      {/* Divider */}
      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-400">
          Didn’t receive the email? Check your spam folder.
        </p>
      </div>
    </div>
  );
}
