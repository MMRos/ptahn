import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook que transforma el desplazamiento de la rueda del ratón (deltaY) en scroll horizontal
 * sobre contenedores con barra de desplazamiento lateral.
 *
 * Se adapta de manera dinámica y reactiva tanto si el contenedor se monta de inmediato
 * como si se renderiza condicionalmente (por ejemplo, cuando las listas de elementos cargan).
 *
 * @param {React.RefObject} [externalRef] - Ref opcional al elemento contenedor. Si no se pasa, se crea y retorna una interna.
 * @param {boolean} [enabled=true] - Si el comportamiento está activo.
 * @returns {React.RefObject} Ref conectada al contenedor con scroll horizontal.
 */
export function useHorizontalWheelScroll(externalRef = null, enabled = true) {
  const internalRef = useRef(null);
  const targetRef = externalRef || internalRef;
  const attachedElementRef = useRef(null);
  const cleanupFnRef = useRef(null);

  const detach = useCallback(() => {
    if (typeof cleanupFnRef.current === 'function') {
      cleanupFnRef.current();
      cleanupFnRef.current = null;
    }
    attachedElementRef.current = null;
  }, []);

  const attach = useCallback((el) => {
    if (!el || !enabled) {
      detach();
      return;
    }

    // Evitar volver a adjuntar si ya está vinculado al mismo nodo DOM
    if (attachedElementRef.current === el) return;

    detach();

    const handleWheel = (e) => {
      // Si el evento no tiene desplazamiento vertical o ya incluye desplazamiento horizontal nativo (e.g. shift+wheel)
      if (!e.deltaY || e.shiftKey) return;

      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      if (maxScrollLeft <= 0) return; // No hay desbordamiento horizontal

      const isScrollingDown = e.deltaY > 0;
      const isScrollingUp = e.deltaY < 0;

      // Comprobar si aún hay recorrido horizontal disponible en esa dirección
      const canScrollRight = isScrollingDown && el.scrollLeft < maxScrollLeft - 1;
      const canScrollLeft = isScrollingUp && el.scrollLeft > 1;

      if (canScrollRight || canScrollLeft) {
        // Prevenir el scroll vertical de la página y aplicar desplazamiento horizontal directo
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
      // Si ya está en el borde extremo, no se previene el default para no atrapar el scroll vertical de la página
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    attachedElementRef.current = el;
    cleanupFnRef.current = () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, detach]);

  // Se ejecuta en cada render para asegurar que elementos condicionales (e.g. carruseles que se muestran al tener items)
  // reciban inmediatamente el listener tan pronto como targetRef.current esté disponible.
  useEffect(() => {
    const currentEl = targetRef?.current;
    if (currentEl) {
      attach(currentEl);
    } else {
      detach();
    }
  });

  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      detach();
    };
  }, [detach]);

  // Soporte como Callback Ref (ref={scrollRef.callbackRef || scrollRef})
  const callbackRef = useCallback((node) => {
    if (targetRef) {
      targetRef.current = node;
    }
    if (node) {
      attach(node);
    } else {
      detach();
    }
  }, [targetRef, attach, detach]);

  Object.assign(targetRef, { callbackRef });
  return targetRef;
}

export default useHorizontalWheelScroll;
