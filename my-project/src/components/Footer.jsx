export default function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 px-4 pb-8 pt-14 text-slate-300 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="text-2xl font-extrabold text-white">ProgressTrack</h3>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            A modern academic management platform for attendance, results, and school-wide communication.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Built by Akere Sama
          </p>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white">Product</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li><a href="#home" className="transition hover:text-cyan-300">Home</a></li>
            <li><a href="#features" className="transition hover:text-cyan-300">Features</a></li>
            <li><a href="/signin" className="transition hover:text-cyan-300">Sign In</a></li>
            <li><a href="#contact" className="transition hover:text-cyan-300">Contact</a></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white">Support</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>Help Center</li>
            <li>FAQ</li>
            <li>Privacy Policy</li>
            <li>Terms of Use</li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white">Contact</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>
              <span className="font-semibold text-white">Email:</span>{" "}
              <a className="transition hover:text-cyan-300" href="mailto:akerenwei1@gmail.com">
                akerenwei1@gmail.com
              </a>
            </p>
            <p>
              <span className="font-semibold text-white">Phone:</span>{" "}
              <a className="transition hover:text-cyan-300" href="tel:+237651508182">
                +237 651508182
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 w-full max-w-7xl border-t border-slate-800 pt-5 text-xs text-slate-500 sm:flex sm:items-center sm:justify-between">
        <p>© 2026 ProgressTrack. All rights reserved.</p>
        <p className="mt-2 sm:mt-0">Designed by Akere Sama</p>
      </div>
    </footer>
  );
}
