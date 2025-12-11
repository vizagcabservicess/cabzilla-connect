
import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingDetails } from './BookingDetails';
import { Booking, BookingStatus } from '@/types/api';

interface BookingDetailsModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (updatedData: Partial<Booking>) => Promise<void>;
  onAssignDriver: (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
  onCancel: () => Promise<void>;
  onGenerateInvoice: (gstEnabled?: boolean, gstDetails?: any) => Promise<any>;
  onStatusChange: (newStatus: BookingStatus) => Promise<void>;
  isSubmitting: boolean;
}

export function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  onEdit,
  onAssignDriver,
  onCancel,
  onGenerateInvoice,
  onStatusChange,
  isSubmitting
}: BookingDetailsModalProps) {
  // Control body scroll when modal is open and track switch interactions
  useEffect(() => {
    if (isOpen) {
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
      
      // Add global event listeners to catch switch interactions
      // CRITICAL FIX: Set flags in capture phase BEFORE dialog handlers run
      // Don't stop propagation - let events reach Switch, but prevent dialog from closing
      const handleSwitchClick = (e: MouseEvent | PointerEvent) => {
        const target = e.target as HTMLElement;
        // #region agent log
        console.log('🔍 handleSwitchClick ENTRY (capture phase)', {targetTag:target?.tagName,targetId:target?.id,targetRole:target?.getAttribute('role'),closestSwitch:!!target.closest('button[role="switch"]'),closestToggle:!!target.closest('[id*="toggle"]'),closestLabel:!!target.closest('label[for*="toggle"]')});
        // #endregion
        if (target.closest('button[role="switch"]') || 
            target.closest('[id*="toggle"]') ||
            target.closest('label[for*="toggle"]')) {
          // #region agent log
          console.log('🔍 handleSwitchClick SETTING FLAGS (capture phase)', {targetTag:target?.tagName,targetId:target?.id});
          // #endregion
          // CRITICAL: Set flags IMMEDIATELY in capture phase so dialog handlers see them
          isInteractingWithSwitch.current = true;
          lastInteractionTime.current = Date.now();
          // Don't stop propagation - let event reach Switch component
        }
      };
      
      const handleSwitchChange = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest('button[role="switch"]') || 
            target.closest('[id*="toggle"]')) {
          isInteractingWithSwitch.current = true;
          lastInteractionTime.current = Date.now();
        }
      };
      
      // Listen for clicks and changes on switches
      document.addEventListener('click', handleSwitchClick, true);
      document.addEventListener('pointerdown', handleSwitchClick, true);
      document.addEventListener('change', handleSwitchChange, true);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('click', handleSwitchClick, true);
        document.removeEventListener('pointerdown', handleSwitchClick, true);
        document.removeEventListener('change', handleSwitchChange, true);
        if (switchInteractionTimeout.current) {
          clearTimeout(switchInteractionTimeout.current);
        }
      };
    } else {
      // Re-enable body scrolling when modal closes
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  if (!booking) return null;

  // Track if we're interacting with a switch to prevent dialog from closing
  const isInteractingWithSwitch = useRef(false);
  const switchInteractionTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionTime = useRef<number>(0);

  // Prevent modal from closing when clicking outside if submitting or interacting with switch
  const handleOpenChange = (open: boolean) => {
    // Don't close if we're interacting with a switch or submitting
    // Also check if a switch interaction happened recently (within last 500ms)
    const timeSinceInteraction = Date.now() - lastInteractionTime.current;
    if (isInteractingWithSwitch.current || timeSinceInteraction < 500) {
      // Clear any existing timeout
      if (switchInteractionTimeout.current) {
        clearTimeout(switchInteractionTimeout.current);
      }
      // Reset the flag after a delay to allow state updates to complete
      switchInteractionTimeout.current = setTimeout(() => {
        isInteractingWithSwitch.current = false;
      }, 500);
      // Prevent closing - force the dialog to stay open
      return;
    }
    // Only close if explicitly closing (not submitting)
    if (!isSubmitting && !open) {
      onClose();
    }
  };

  // Prevent dialog from closing when clicking on ANY element inside the dialog content
  // This includes tabs, toggles, buttons, inputs, etc.
  const handleInteractOutside = (event: Event) => {
    const target = event.target as HTMLElement;
    // #region agent log
    // Production logging: handleInteractOutside ENTRY
    // #endregion
    if (target) {
      // Check if the click is inside the dialog content area
      const dialogContent = target.closest('[role="dialog"]');
      // Check for any interactive elements inside the dialog
      const isInsideDialog = target.closest('.booking-details-modal-content') ||
                            target.closest('[data-radix-dialog-content]') ||
                            target.closest('button[role="switch"]') || 
                            target.closest('[data-state]') ||
                            target.closest('label[for*="toggle"]') ||
                            target.closest('.flex.items-center.space-x-2') ||
                            target.closest('[id*="toggle"]') ||
                            target.closest('input') ||
                            target.closest('button') ||
                            target.closest('select') ||
                            target.closest('[role="tab"]') ||
                            target.closest('[role="tabpanel"]');
      // If clicking inside the dialog (not on the backdrop), prevent closing
      if (dialogContent || isInsideDialog) {
        if (isInsideDialog) {
          // #region agent log
          console.log('🔍 handleInteractOutside TRACKING (NOT preventing default on switch)', {targetTag:target?.tagName,targetId:target?.id,isSwitch:!!target.closest('button[role="switch"]')});
          // #endregion
          isInteractingWithSwitch.current = true;
          lastInteractionTime.current = Date.now();
          // CRITICAL FIX: Don't prevent default on switch clicks - let them work normally
          // Only prevent default if clicking on backdrop (outside dialog)
          const isSwitch = target.closest('button[role="switch"]') || target.closest('[id*="toggle"]');
          if (!isSwitch) {
            event.preventDefault();
            event.stopPropagation();
          }
          return false;
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }
    return true;
  };

  // Track if close button was clicked
  const closeButtonClicked = useRef(false);
  
  // Add global listener to detect close button clicks
  useEffect(() => {
    if (isOpen) {
      const handleCloseButtonClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Check if click is on close button (X icon or its parent button)
        const isCloseButton = target.closest('button[data-radix-dialog-close]') ||
                             (target.closest('button') && target.closest('button')?.querySelector('svg')) ||
                             target.closest('[aria-label*="close" i]') ||
                             target.closest('.sr-only')?.textContent?.toLowerCase().includes('close');
        if (isCloseButton) {
          // #region agent log
          console.log('🔍 Close button (X) detected - setting flag', {targetTag: target?.tagName, targetId: target?.id});
          // #endregion
          closeButtonClicked.current = true;
          // Reset after a short delay to allow onOpenChange to process
          setTimeout(() => {
            closeButtonClicked.current = false;
          }, 100);
        }
      };
      
      document.addEventListener('click', handleCloseButtonClick, true);
      return () => {
        document.removeEventListener('click', handleCloseButtonClick, true);
      };
    }
  }, [isOpen]);
  
  // More aggressive prevention - block onOpenChange from closing unless explicitly requested
  // BUT allow close button (X) to always work
  const handleDialogOpenChange = (open: boolean) => {
    // #region agent log
    console.log('🔍 handleDialogOpenChange CALLED', {
      open,
      isSubmitting,
      isInteractingWithSwitch: isInteractingWithSwitch.current,
      lastInteractionTime: lastInteractionTime.current,
      timeSinceInteraction: Date.now() - lastInteractionTime.current,
      closeButtonClicked: closeButtonClicked.current
    });
    // #endregion
    // If trying to close, check if we should allow it
    if (!open) {
      // CRITICAL: Always allow close if close button was clicked
      if (closeButtonClicked.current) {
        // #region agent log
        console.log('🔍 handleDialogOpenChange ALLOWING CLOSE (close button clicked)');
        // #endregion
        closeButtonClicked.current = false; // Reset flag
        onClose();
        return;
      }
      
      // Don't close if submitting
      if (isSubmitting) {
        // #region agent log
        console.log('🔍 handleDialogOpenChange BLOCKED (submitting)');
        // #endregion
        return;
      }
      // Don't close if we recently interacted with a switch (but allow close button)
      const timeSinceInteraction = Date.now() - lastInteractionTime.current;
      if (isInteractingWithSwitch.current || timeSinceInteraction < 500) {
        // #region agent log
        console.log('🔍 handleDialogOpenChange BLOCKED (switch interaction)', {isInteractingWithSwitch:isInteractingWithSwitch.current,timeSinceInteraction});
        // #endregion
        // Force dialog to stay open by not calling onClose
        return;
      }
      // #region agent log
      console.log('🔍 handleDialogOpenChange ALLOWING CLOSE');
      // #endregion
      // Only close if explicitly requested (user clicked X or pressed ESC intentionally)
      onClose();
    } else {
      // Opening - allow it
      // This shouldn't happen as isOpen is controlled, but handle it just in case
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[85vh] overflow-y-auto booking-details-modal-content fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50"
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          // #region agent log
          console.log('🔍 onInteractOutside CALLED', {targetTag:target?.tagName,targetId:target?.id,isSwitch:!!(target.closest('button[role="switch"]') || target.closest('[id*="toggle"]'))});
          // #endregion
          // Check if clicking on a switch
          const isSwitch = target.closest('button[role="switch"]') || target.closest('[id*="toggle"]');
          if (isSwitch) {
            // #region agent log
            console.log('🔍 onInteractOutside PREVENTING (switch click)');
            // #endregion
            // CRITICAL: Prevent dialog from closing when clicking on switch
            e.preventDefault();
            return;
          }
          // Only prevent if clicking on backdrop, not on dialog content
          const isOnBackdrop = !target.closest('[role="dialog"]') && 
                               !target.closest('.booking-details-modal-content');
          if (!isOnBackdrop) {
            // Clicking inside dialog - prevent closing
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          // #region agent log
          console.log('🔍 onPointerDownOutside CALLED', {targetTag:target?.tagName,targetId:target?.id,isSwitch:!!(target.closest('button[role="switch"]') || target.closest('[id*="toggle"]'))});
          // #endregion
          // Check if clicking on a switch
          const isSwitch = target.closest('button[role="switch"]') || target.closest('[id*="toggle"]');
          if (isSwitch) {
            // #region agent log
            console.log('🔍 onPointerDownOutside PREVENTING (switch click)');
            // #endregion
            // CRITICAL: Prevent dialog from closing when clicking on switch
            e.preventDefault();
            return;
          }
          // Only prevent if clicking on backdrop, not on dialog content
          const isOnBackdrop = !target.closest('[role="dialog"]') && 
                               !target.closest('.booking-details-modal-content');
          if (!isOnBackdrop) {
            // Clicking inside dialog - prevent closing
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Allow ESC to close only if not submitting
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="sticky top-0 z-[51] bg-white pb-2 border-b">
          <DialogTitle className="text-sm font-semibold">Booking #{booking.bookingNumber}</DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <BookingDetails
            booking={booking}
            onClose={onClose}
            onEdit={onEdit}
            onAssignDriver={onAssignDriver}
            onCancel={onCancel}
            onGenerateInvoice={onGenerateInvoice}
            onStatusChange={onStatusChange}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
