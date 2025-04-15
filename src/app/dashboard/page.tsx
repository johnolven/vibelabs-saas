'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

// Example data structure for dashboard widgets (replace with actual data fetching)
interface WidgetData {
  id: string;
  title: string;
  value: string;
  description: string;
  link?: string; // Optional link for the widget
  bgColor?: string; // Optional background color class
  textColor?: string; // Optional text color class
}

const exampleWidgets: WidgetData[] = [
  {
    id: 'users',
    title: 'Usuarios Activos',
    value: '1,234',
    description: '+15% desde ayer',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-200'
  },
  {
    id: 'revenue',
    title: 'Ingresos Mensuales',
    value: '$5,678',
    description: 'Mes actual'
    // Default bg-card and text-card-foreground will be used
  },
  {
    id: 'tasks',
    title: 'Tareas Pendientes',
    value: '27',
    description: '3 vencen hoy',
    link: '/dashboard/tasks',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-800 dark:text-yellow-200'
  },
];

// Updated Widget component with dark mode support
function DashboardWidget({ title, value, description, link, bgColor = 'bg-card', textColor = 'text-card-foreground' }: WidgetData) {
  const cardClasses = `rounded-xl shadow-sm p-6 border border-border transition-all duration-200 ${bgColor}`;
  const hoverClasses = 'hover:shadow-md hover:-translate-y-1';

  const content = (
    <>
      <div className="flex items-center justify-between mb-2">
        <h2 className={`text-lg font-semibold ${textColor}`}>{title}</h2>
        {/* Icon placeholder */}
      </div>
      <p className={`text-3xl font-bold ${textColor} mb-1`}>{value}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </>
  );

  if (link) {
    return (
      <Link href={link} passHref>
        <motion.div
           whileHover={{ scale: 1.03, y: -2 }}
           className={`${cardClasses} ${hoverClasses} cursor-pointer block`}
        >
          {content}
        </motion.div>
      </Link>
    );
  } else {
    return (
        <motion.div
           whileHover={{ scale: 1.02 }}
           className={cardClasses}
         >
           {content}
         </motion.div>
    );
  }
}

export default function Dashboard() {
  // In a real app, fetch actual data here, e.g., using useEffect
  const widgets = exampleWidgets;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Title is now handled by the header in layout */}
        {/* <h1 className="text-3xl font-bold text-foreground mb-6">Dashboard</h1> */}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets.map((widget) => (
             <DashboardWidget key={widget.id} {...widget} />
          ))}
          
          {/* Placeholder Area */}
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.2, duration: 0.5 }}
             className="md:col-span-2 lg:col-span-3 bg-card rounded-xl shadow-sm p-6 border border-border min-h-[200px] flex items-center justify-center text-muted-foreground"
           >
             <span>Área para Gráficos o Contenido Principal</span>
           </motion.div>
        </div>
      </motion.div>
    </>
  );
} 