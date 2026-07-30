// ══════════════════════════════════════════════════════════════════
// СЛОВАРЬ ИКОНОК
// Содержимое приходит с сервера, где иконка записана строкой
// (например "Gauge"). Здесь строка превращается в компонент иконки.
// Чтобы добавить новую иконку — впишите её в список ниже.
// ══════════════════════════════════════════════════════════════════

import {
  Gauge, StopCircle, ParkingMeter, Bus, BusFront, TrainFront, Smartphone, UserCheck,
  BarChart3, FileText, Radar, Cpu, Database, CloudRain, Timer, Camera, ScanLine,
  MapPin, Network, Shield, Zap, Radio, AlertTriangle, Clock, Award, Landmark,
  Briefcase, Globe2, RectangleHorizontal,
} from "lucide-react";

export const iconMap: Record<string, any> = {
  Gauge, StopCircle, ParkingMeter, Bus, BusFront, TrainFront, Smartphone, UserCheck,
  BarChart3, FileText, Radar, Cpu, Database, CloudRain, Timer, Camera, ScanLine,
  MapPin, Network, Shield, Zap, Radio, AlertTriangle, Clock, Award, Landmark,
  Briefcase, Globe2, RectangleHorizontal,
};

/** Получить компонент иконки по имени (или запасную, если имя неизвестно) */
export function getIcon(name: any) {
  if (typeof name !== "string") return name || Shield; // уже компонент
  return iconMap[name] || Shield;
}
