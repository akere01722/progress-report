export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-14 px-8">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10">

        {/* Brand */}
        <div>
          <h2 className="text-2xl font-bold text-white">ProgressTrack</h2>
          <p className="mt-3 text-gray-400 text-sm leading-relaxed">
            A modern platform helping schools track student performance,
            attendance, and academic growth with clarity.
          </p>
          <p className="mt-4 text-gray-400 text-sm italic">
            Founded by <span className="text-blue-400 font-semibold">AKERE SAMA</span>
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-semibold text-lg mb-4">Quick Links</h3>
          <ul className="space-y-2">
            <li><a className="hover:text-blue-400" href="#">Home</a></li>
            <li><a className="hover:text-blue-400" href="#">Features</a></li>
            <li><a className="hover:text-blue-400" href="#">Pricing</a></li>
            <li><a className="hover:text-blue-400" href="#">About</a></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-white font-semibold text-lg mb-4">Support</h3>
          <ul className="space-y-2">
            <li><a className="hover:text-blue-400" href="#">Help Center</a></li>
            <li><a className="hover:text-blue-400" href="#">FAQ</a></li>
            <li><a className="hover:text-blue-400" href="#">Terms of Service</a></li>
            <li><a className="hover:text-blue-400" href="#">Privacy Policy</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-white font-semibold text-lg mb-4">Contact Us</h3>
          <p className="text-gray-400">Email: support@progresstrack.com</p>
          <p className="text-gray-400">Phone: +1 234 567 890</p>

          <div className="flex gap-4 mt-4">
            <a href="#" className="hover:text-blue-400">Facebook</a>
            <a href="#" className="hover:text-blue-400">Twitter</a>
            <a href="#" className="hover:text-blue-400">LinkedIn</a>
          </div>
        </div>

      </div>

      {/* Footer Bottom */}
      <div className="text-center text-gray-500 mt-10 pt-6 border-t border-gray-700">
        © 2025 ProgressTrack. All rights reserved. | Designed by 
        <span className="text-blue-400 font-semibold"> AKERE SAMA</span>
      </div>
    </footer>
  );
}
