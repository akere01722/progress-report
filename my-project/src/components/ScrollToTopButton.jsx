import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiArrowUp } from "react-icons/fi";

const SCROLL_TRIGGER = 220;

const getTarget = () => {
  const element = document.querySelector("[data-scroll-root]");
  if (element instanceof HTMLElement) return element;
  return window;
};

const getTop = (target) =>
  target === window ? window.scrollY || window.pageYOffset : target.scrollTop;

export default function ScrollToTopButton() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState(window);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setTarget(getTarget());
    }, 0);

    return () => window.clearTimeout(id);
  }, [location.pathname]);

  const top = useMemo(() => getTop(target), [target]);

  useEffect(() => {
    const onScroll = () => {
      setVisible(getTop(target) > SCROLL_TRIGGER);
    };

    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      target.removeEventListener("scroll", onScroll);
    };
  }, [target, top]);

  const scrollToTop = () => {
    if (target === window) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    target.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
      className={[
        "fixed bottom-6 right-6 z-[60] h-12 w-12 rounded-full",
        "bg-blue-600 text-white shadow-lg transition-all duration-200",
        "hover:bg-blue-700 hover:-translate-y-0.5",
        "focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2",
        visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3",
      ].join(" ")}
    >
      <FiArrowUp className="mx-auto text-xl" />
    </button>
  );
}
