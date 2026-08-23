import type { PropsWithChildren, ReactNode } from 'react';

interface CardProps extends PropsWithChildren {
  title?: string;
  action?: ReactNode;
  className?: string;
}

export function Card({ title, action, className = '', children }: CardProps) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && <header className="card-header"><h2>{title}</h2>{action}</header>}
      {children}
    </section>
  );
}
