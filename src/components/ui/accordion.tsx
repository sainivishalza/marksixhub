'use client';

import * as Primitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Accordion = Primitive.Root;

export function AccordionItem({ className, ...props }: Primitive.AccordionItemProps) {
  return <Primitive.Item className={cn('border-b border-line', className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: Primitive.AccordionTriggerProps) {
  return (
    <Primitive.Header className="m-0">
      <Primitive.Trigger
        className={cn(
          'group flex w-full items-center justify-between gap-4 py-4 text-left font-serif text-lg text-ivory hover:text-gold-bright',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-gold transition-transform group-data-[state=open]:rotate-180" />
      </Primitive.Trigger>
    </Primitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: Primitive.AccordionContentProps) {
  return (
    <Primitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...props}>
      <div className={cn('max-w-[68ch] pb-5 leading-relaxed text-mute', className)}>{children}</div>
    </Primitive.Content>
  );
}
