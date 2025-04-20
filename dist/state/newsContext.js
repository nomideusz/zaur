import { Context, FiniteStateMachine, StateHistory } from 'runed';
// Context for sharing news state across components
export const newsContext = new Context("newsContext");
// Create a finite state machine for managing news loading states
export function createNewsMachine() {
    return new FiniteStateMachine("idle", {
        idle: {
            fetch: "fetching",
            _enter: () => {
                console.log("News panel is idle and ready");
            }
        },
        fetching: {
            success: "refreshing",
            error: "error",
            _enter: () => {
                console.log("Fetching news...");
            }
        },
        refreshing: {
            complete: "idle",
            error: "error",
            _enter: () => {
                console.log("Refreshing news display...");
            }
        },
        error: {
            retry: "fetching",
            _enter: () => {
                console.log("Error loading news");
            }
        }
    });
}
// Create a history tracker for undo/redo functionality
export function createNewsHistory(getItems, setItems) {
    return new StateHistory(getItems, setItems);
}
