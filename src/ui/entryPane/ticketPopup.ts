import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface TicketPopupActions {
  readonly openEntry: (startLine: number, anchor: DOMRect) => void;
  readonly openTicket: (ticketId: string, anchor: DOMRect) => void;
}

export type PopupTarget =
  | { readonly kind: "entry"; readonly startLine: number }
  | { readonly kind: "ticket"; readonly ticketId: string };

interface PopupState {
  readonly target: PopupTarget;
  readonly anchor: DOMRect;
}

export interface TicketPopup {
  readonly target: PopupTarget | null;
  readonly anchor: DOMRect | null;
  readonly actions: TicketPopupActions;
  readonly dismiss: () => void;
  readonly onPopupMouseEnter: () => void;
  readonly onPopupMouseLeave: () => void;
}

const TicketPopupContext = createContext<TicketPopupActions | null>(null);

export const TicketPopupProvider = TicketPopupContext.Provider;

export const useTicketPopupActions = (): TicketPopupActions => {
  const actions = useContext(TicketPopupContext);
  if (actions === null) throw new Error("TicketPopupContext is missing");
  return actions;
};

export const useTicketPopup = (): TicketPopup => {
  const [state, setState] = useState<PopupState | null>(null);
  const cmdDown = useRef(false);
  const overPopup = useRef(false);

  const close = useCallback(() => {
    overPopup.current = false;
    setState(null);
  }, []);

  const openEntry = useCallback((startLine: number, anchor: DOMRect) => {
    cmdDown.current = true;
    setState((prev) =>
      prev !== null && prev.target.kind === "entry" && prev.target.startLine === startLine
        ? prev
        : { target: { kind: "entry", startLine }, anchor },
    );
  }, []);

  const openTicket = useCallback((ticketId: string, anchor: DOMRect) => {
    cmdDown.current = true;
    setState((prev) =>
      prev !== null && prev.target.kind === "ticket" && prev.target.ticketId === ticketId
        ? prev
        : { target: { kind: "ticket", ticketId }, anchor },
    );
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const was = cmdDown.current;
      cmdDown.current = event.metaKey;
      if (was && !event.metaKey && !overPopup.current) close();
    };
    const onBlur = () => {
      cmdDown.current = false;
      overPopup.current = false;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [close]);

  const onPopupMouseEnter = useCallback(() => {
    overPopup.current = true;
  }, []);

  const onPopupMouseLeave = useCallback(() => {
    overPopup.current = false;
    if (!cmdDown.current) close();
  }, [close]);

  const actions = useMemo<TicketPopupActions>(
    () => ({ openEntry, openTicket }),
    [openEntry, openTicket],
  );

  return {
    target: state?.target ?? null,
    anchor: state?.anchor ?? null,
    actions,
    dismiss: close,
    onPopupMouseEnter,
    onPopupMouseLeave,
  };
};
