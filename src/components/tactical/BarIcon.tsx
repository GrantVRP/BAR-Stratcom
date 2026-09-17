"use client";

import React from "react";

export interface BarIconProps {
  name: string;
  faction?: "armada" | "cortex" | "Armada" | "Cortex";
  className?: string;
  size?: number;
}

export const BarIcon: React.FC<BarIconProps> = ({
  name,
  faction = "Armada",
  className = "size-4",
  size = 18,
}) => {
  const isArmada = faction.toLowerCase() === "armada";
  const factionAccent = isArmada ? "#48a2ef" : "#ff2a2a";
  const cleanName = (name || "").toLowerCase().trim();

  // 1. Solar Collector (Armada or Cortex official Beyond All Reason render)
  if (cleanName.includes("solar")) {
    if (isArmada || cleanName.includes("armada")) {
      return (
        <img
          src="/armada-solar.png"
          alt={name}
          width={size || 32}
          height={size || 32}
          className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
        />
      );
    }

    // Cortex Solar Collector official render
    return (
      <img
        src="/cortex-solar.png"
        alt={name}
        width={size || 32}
        height={size || 32}
        className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
      />
    );
  }


  // 2. Wind Turbine / Generator (Armada or Cortex official Beyond All Reason render)
  if (cleanName.includes("wind") || cleanName.includes("turbine")) {
    if (isArmada || cleanName.includes("armada")) {
      return (
        <img
          src="/armada-wind.png"
          alt={name}
          width={size || 32}
          height={size || 32}
          className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
        />
      );
    }

    // Cortex Wind Turbine official render
    return (
      <img
        src="/cortex-wind.png"
        alt={name}
        width={size || 32}
        height={size || 32}
        className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
      />
    );
  }

  // 3. Metal Extractor / Mex (Armada or Cortex official Beyond All Reason render)
  if (cleanName.includes("extractor") || cleanName.includes("mex")) {
    if (isArmada || cleanName.includes("armada")) {
      return (
        <img
          src="/armada-mex.png"
          alt={name}
          width={size || 32}
          height={size || 32}
          className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
        />
      );
    }

    // Cortex Metal Extractor official render
    return (
      <img
        src="/cortex-mex.png"
        alt={name}
        width={size || 32}
        height={size || 32}
        className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
      />
    );
  }

  // 4. Fusion Reactor (Armada or Cortex official Beyond All Reason render)
  if (cleanName.includes("fusion")) {
    if (isArmada || cleanName.includes("armada")) {
      return (
        <img
          src="/armada-fusion.png"
          alt={name}
          width={size || 32}
          height={size || 32}
          className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
        />
      );
    }

    // Cortex Fusion Reactor official render
    return (
      <img
        src="/cortex-fusion.png"
        alt={name}
        width={size || 32}
        height={size || 32}
        className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
      />
    );
  }


  // 4. Vehicle Plant / Factory / Bot Lab / Aircraft Plant / Shipyard (industrial chassis / robotic arm glyph)
  if (
    cleanName.includes("factory") ||
    cleanName.includes("lab") ||
    cleanName.includes("plant") ||
    cleanName.includes("shipyard") ||
    cleanName.includes("aircraft")
  ) {
    // Vehicle Plant / Factory official 3D renders
    if (cleanName.includes("vehicle") || cleanName.includes("vplant")) {
      if ((isArmada || cleanName.includes("armada")) && !cleanName.includes("cortex") && !cleanName.includes("cor")) {
        return (
          <img
            src="/armada-vplant.png"
            alt={name}
            width={size || 32}
            height={size || 32}
            className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
          />
        );
      }

      // Cortex Vehicle Plant official 3D render
      return (
        <img
          src="/cortex-vplant.png"
          alt={name}
          width={size || 32}
          height={size || 32}
          className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
        />
      );
    }

    // Bot Lab official 3D render
    if (cleanName.includes("bot lab") || cleanName.includes("botlab") || cleanName === "lab") {
      if ((isArmada || cleanName.includes("armada")) && !cleanName.includes("cortex") && !cleanName.includes("cor")) {
        return (
          <img
            src="/armada-botlab.png"
            alt={name}
            width={size || 32}
            height={size || 32}
            className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
          />
        );
      }

      // Cortex Bot Lab official 3D render
      return (
        <img
          src="/cortex-botlab.png"
          alt={name}
          width={size || 32}
          height={size || 32}
          className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
        />
      );
    }

    // Aircraft Plant official 3D render
    if (
      cleanName.includes("aircraft") ||
      cleanName.includes("air plant") ||
      cleanName.includes("airplant")
    ) {
      if ((isArmada || cleanName.includes("armada")) && !cleanName.includes("cortex") && !cleanName.includes("cor")) {
        return (
          <img
            src="/armada-aircraft-plant.png"
            alt={name}
            width={size || 32}
            height={size || 32}
            className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
          />
        );
      }

      // Cortex Aircraft Plant official 3D render
      return (
        <img
          src="/cortex-aircraft-plant.png"
          alt={name}
          width={size || 32}
          height={size || 32}
          className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
        />
      );
    }

    // Shipyard official 3D render
    if (cleanName.includes("shipyard") || cleanName.includes("naval")) {
      if ((isArmada || cleanName.includes("armada")) && !cleanName.includes("cortex") && !cleanName.includes("cor")) {
        return (
          <img
            src="/armada-shipyard.png"
            alt={name}
            width={size || 32}
            height={size || 32}
            className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
          />
        );
      }

      // Cortex Shipyard official 3D render
      return (
        <img
          src="/cortex-shipyard.png"
          alt={name}
          width={size || 32}
          height={size || 32}
          className={`${className || "w-full h-full"} object-contain pixelated drop-shadow-[2px_2px_0px_#000000]`}
        />
      );
    }

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Industrial Fabrication Base */}
        <rect x="3" y="16" width="18" height="5" rx="1" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.4" />
        {/* Dual Fabrication Gantry Columns */}
        <rect x="5" y="6" width="3" height="10" fill="#334155" stroke="#94a3b8" strokeWidth="1.2" />
        <rect x="16" y="6" width="3" height="10" fill="#334155" stroke="#94a3b8" strokeWidth="1.2" />
        {/* Overhead Robotic Gantry Beam */}
        <line x1="5" y1="6" x2="19" y2="6" stroke="#94a3b8" strokeWidth="1.6" />
        {/* Robotic Welding Arm & Laser Head */}
        <path d="M12 6V11L14 13" stroke={factionAccent} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="14" cy="13" r="1.5" fill="#ffffff" />
        {/* Active Laser Flash */}
        <line x1="14" y1="13" x2="12" y2="16" stroke={factionAccent} strokeWidth="1.4" strokeDasharray="1 1" />
      </svg>
    );
  }

  // 5. Energy Storage / Metal Storage (Armada & Cortex 3D renders, battery cells / vault cylinder)
  if (cleanName.includes("storage")) {
    const isEnergy = cleanName.includes("energy");

    if (isEnergy) {
      if (isArmada || cleanName.includes("armada")) {
        return (
          <img
            src="/armada-estorage.png"
            alt={name}
            width={size || 32}
            height={size || 32}
            className={`${className || "w-full h-full"} object-contain drop-shadow-[0_0_6px_rgba(72,162,239,0.25)]`}
          />
        );
      }

      // Cortex Energy Storage official render
      return (
        <img
          src="/cortex-estorage.png"
          alt={name}
          width={size || 32}
          height={size || 32}
          className={`${className || "w-full h-full"} object-contain drop-shadow-[0_0_6px_rgba(255,42,42,0.25)]`}
        />
      );
    }

    // Metal Storage fallback vault cylinder
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        <ellipse cx="12" cy="7" rx="8" ry="3" stroke="#94a3b8" strokeWidth="1.6" fill="#1e293b" />
        <path d="M4 7V17C4 18.6 7.6 20 12 20C16.4 20 20 18.6 20 17V7" stroke="#94a3b8" strokeWidth="1.6" fill="#1e293b" fillOpacity="0.3" />
        <ellipse cx="12" cy="12" rx="8" ry="3" stroke="#64748b" strokeWidth="1.2" strokeDasharray="2 2" />
        <circle cx="12" cy="14" r="1.8" fill={factionAccent} />
      </svg>
    );
  }

  // 6. Energy Converter (conversion loop / dual circular arrows)
  if (cleanName.includes("converter") || cleanName.includes("conversion")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        <path d="M12 4C7.58 4 4 7.58 4 12C4 14.2 4.9 16.2 6.34 17.66L7.75 16.25C6.67 15.17 6 13.67 6 12C6 8.69 8.69 6 12 6H13V3L17 7L13 11V8H12Z" fill="#eab308" />
        <path d="M12 20C16.42 20 20 16.42 20 12C20 9.8 19.1 7.8 17.66 6.34L16.25 7.75C17.33 8.83 18 10.33 18 12C18 15.31 15.31 18 12 18H11V21L7 17L11 13V16H12Z" fill="#06b6d4" />
      </svg>
    );
  }

  // 7. Light Laser Tower / LLT / Defense (laser turret head with directed beam)
  if (cleanName.includes("tower") || cleanName.includes("llt") || cleanName.includes("defense")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Concrete Bunker Base */}
        <polygon points="4,21 7,14 17,14 20,21" stroke="#94a3b8" strokeWidth="1.5" fill="#1e293b" />
        {/* Rotating Turret Pod */}
        <circle cx="12" cy="11" r="4" stroke={factionAccent} strokeWidth="1.6" fill="#0f172a" />
        {/* Directed Laser Barrel */}
        <line x1="12" y1="11" x2="19" y2="6" stroke={factionAccent} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="20" cy="5" r="1.5" fill="#ffffff" />
      </svg>
    );
  }

  // 8. Commander (starred shield / command rank chevron)
  if (cleanName.includes("commander") || cleanName.includes("cdr")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Hardened Shield Outline */}
        <path
          d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z"
          stroke={factionAccent}
          strokeWidth="1.6"
          fill={factionAccent}
          fillOpacity="0.15"
        />
        {/* Command Star Chevron */}
        <polygon
          points="12,6.5 13.5,10 17,10 14,12.5 15,16 12,14 9,16 10,12.5 7,10 10.5,10"
          fill="#ffffff"
          stroke={factionAccent}
          strokeWidth="0.8"
        />
        <circle cx="12" cy="11.5" r="1" fill={factionAccent} />
      </svg>
    );
  }

  // 9. Flash Tank / Blitz (tracked high-speed raider silhouette)
  if (cleanName.includes("flash") || cleanName.includes("blitz")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Sleek Lower Tank Tracks */}
        <rect x="3" y="14" width="18" height="6" rx="2" stroke="#94a3b8" strokeWidth="1.4" fill="#1e293b" />
        <circle cx="6.5" cy="17" r="1" fill="#cbd5e1" />
        <circle cx="12" cy="17" r="1" fill="#cbd5e1" />
        <circle cx="17.5" cy="17" r="1" fill="#cbd5e1" />
        {/* Angled High-Speed Hull */}
        <polygon points="5,14 8,9 16,9 18,14" fill={factionAccent} fillOpacity="0.25" stroke={factionAccent} strokeWidth="1.2" />
        {/* Low Profile Turret & Dual Pulse Cannons */}
        <rect x="9" y="7" width="6" height="4" rx="1" fill="#0f172a" stroke={factionAccent} strokeWidth="1.2" />
        <line x1="15" y1="8.5" x2="22" y2="8.5" stroke={factionAccent} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="15" y1="10.5" x2="21" y2="10.5" stroke={factionAccent} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // 10. Stump / Raider / Leveler (heavy assault cannon profile)
  if (
    cleanName.includes("stump") ||
    cleanName.includes("raider") ||
    cleanName.includes("goliath") ||
    cleanName.includes("bulldog") ||
    cleanName.includes("leveler")
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Heavy Armored Tracks */}
        <rect x="2" y="13" width="20" height="7" rx="2" stroke="#64748b" strokeWidth="1.6" fill="#0f172a" />
        <circle cx="5.5" cy="16.5" r="1.2" fill="#94a3b8" />
        <circle cx="10" cy="16.5" r="1.2" fill="#94a3b8" />
        <circle cx="14" cy="16.5" r="1.2" fill="#94a3b8" />
        <circle cx="18.5" cy="16.5" r="1.2" fill="#94a3b8" />
        {/* Sloped Heavy Glacis */}
        <polygon points="4,13 7,7 17,7 19,13" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.4" />
        {/* Massive Turret & Heavy Bore Cannon */}
        <rect x="9" y="5" width="6" height="4" rx="1" fill="#334155" stroke={factionAccent} strokeWidth="1.4" />
        <rect x="15" y="6" width="8" height="2.5" rx="0.5" fill={factionAccent} />
        <line x1="21" y1="5.5" x2="21" y2="9" stroke="#ffffff" strokeWidth="1" />
      </svg>
    );
  }

  // 11. Rocko / Hammer / Storm / Samson / Slasher (rocket artillery reticle)
  if (
    cleanName.includes("rocko") ||
    cleanName.includes("storm") ||
    cleanName.includes("hammer") ||
    cleanName.includes("samson") ||
    cleanName.includes("slasher") ||
    cleanName.includes("wolverine")
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Outer Artillery Crosshair Reticle */}
        <circle cx="12" cy="12" r="8" stroke="#64748b" strokeWidth="1.2" strokeDasharray="3 2" />
        <line x1="12" y1="2" x2="12" y2="6" stroke="#94a3b8" strokeWidth="1.4" />
        <line x1="12" y1="18" x2="12" y2="22" stroke="#94a3b8" strokeWidth="1.4" />
        <line x1="2" y1="12" x2="6" y2="12" stroke="#94a3b8" strokeWidth="1.4" />
        <line x1="18" y1="12" x2="22" y2="12" stroke="#94a3b8" strokeWidth="1.4" />
        {/* Dual Rocket Launch Pods */}
        <rect x="8" y="8" width="3" height="8" rx="0.5" fill={factionAccent} />
        <rect x="13" y="8" width="3" height="8" rx="0.5" fill={factionAccent} />
        <polygon points="9.5,5 8,8 11,8" fill="#ffffff" />
        <polygon points="14.5,5 13,8 16,8" fill="#ffffff" />
      </svg>
    );
  }

  // 12. Tick / Roach (crawling insectoid EMP/bomb glyph)
  if (cleanName.includes("tick") || cleanName.includes("roach")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Insectoid Spider Legs */}
        <path d="M4 6L8 10M20 6L16 10" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M3 12L8 12M21 12L16 12" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M4 18L8 14M20 18L16 14" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
        {/* Explosive / EMP Core Body */}
        <ellipse cx="12" cy="12" rx="4.5" ry="6" fill="#1e293b" stroke={factionAccent} strokeWidth="1.6" />
        {/* Shock / Detonation Glyph */}
        <path d="M12 9V15M10 11L14 13M14 11L10 13" stroke={factionAccent} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
      </svg>
    );
  }

  // 13. Construction Vehicle / Con Bot / Beaver / Lazarus (wrench / nanolathe beam)
  if (
    cleanName.includes("construction") ||
    cleanName.includes("con") ||
    cleanName.includes("beaver") ||
    cleanName.includes("lazarus")
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Engineering Wrench */}
        <path
          d="M14.7 6.3C13.5 5.1 11.7 4.9 10.3 5.7L12.4 7.8L11 9.2L8.9 7.1C8.1 8.5 8.3 10.3 9.5 11.5C10.7 12.7 12.5 12.9 13.9 12.1L18.1 16.3C18.5 16.7 19.1 16.7 19.5 16.3L20.3 15.5C20.7 15.1 20.7 14.5 20.3 14.1L16.1 9.9C16.9 8.5 16.7 6.7 14.7 6.3Z"
          fill="#10b981"
          stroke="#10b981"
          strokeWidth="1.2"
        />
        {/* Nanolathe Projection Beam */}
        <path d="M7 13L3 21" stroke={factionAccent} strokeWidth="2" strokeLinecap="round" />
        <line x1="5" y1="17" x2="2" y2="15" stroke={factionAccent} strokeWidth="1.4" />
        <circle cx="3" cy="21" r="1.5" fill="#ffffff" />
      </svg>
    );
  }

  // 14. Air Units (Sparrow / Tornado / Shadow / Freedom Fighter)
  if (
    cleanName.includes("sparrow") ||
    cleanName.includes("tornado") ||
    cleanName.includes("shadow") ||
    cleanName.includes("freedom") ||
    cleanName.includes("air") ||
    cleanName.includes("gunship")
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Swept Delta Wing Stealth Silhouette */}
        <polygon
          points="12,3 15,10 22,14 14,15 12,21 10,15 2,14 9,10"
          fill="#1e293b"
          stroke={factionAccent}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11" r="1.5" fill="#ffffff" />
      </svg>
    );
  }

  // 15. Reclaim (recycling / resource magnet extraction)
  if (cleanName.includes("reclaim") || cleanName.includes("boulder") || cleanName.includes("tree")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <title>{name}</title>
        {/* Recycle Loop */}
        <path d="M7 11V7H11" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 7L3.5 10.5C5.5 5 11 3.5 16 5.5" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M17 13V17H13" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 17L20.5 13.5C18.5 19 13 20.5 8 18.5" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" fill="#10b981" />
      </svg>
    );
  }

  // 16. Default Tactical Infantry / Combat Bot / Paw / Grunt
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>{name}</title>
      <polygon
        points="12,3 19,7 19,17 12,21 5,17 5,7"
        stroke="#94a3b8"
        strokeWidth="1.4"
        fill="#1e293b"
      />
      <circle cx="12" cy="12" r="3" fill={factionAccent} />
      <line x1="12" y1="6" x2="12" y2="8" stroke="#ffffff" strokeWidth="1.2" />
      <line x1="12" y1="16" x2="12" y2="18" stroke="#ffffff" strokeWidth="1.2" />
    </svg>
  );
};

export default BarIcon;
