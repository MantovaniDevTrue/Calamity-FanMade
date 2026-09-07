import { Terraria, Modules } from './../../../TL/ModImports.js';

const { Vector2 } = Modules;

function N(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function safeDirection(player, fallback = 1) {
    try { return N(Terraria.PlayerDirection(player), fallback) < 0 ? -1 : 1; }
    catch (_) { return fallback < 0 ? -1 : 1; }
}

function safeGravDir(player) {
    try { return N(player.gravDir, 1) < 0 ? -1 : 1; }
    catch (_) { return 1; }
}

function rotateXY(x, y, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return Vector2.new(x * c - y * s, x * s + y * c);
}

export function SafePlayerCenter(player) {
    try { return Terraria.PlayerCenter(player); } catch (_) { }
    try { return player.MountedCenter; } catch (_) { return Vector2.Zero; }
}

export function AimFromMouse(player, origin = null, fallbackX = 1, fallbackY = 0) {
    const base = origin || SafePlayerCenter(player);
    try {
        const mouse = Terraria.Main.MouseWorld;
        const dx = N(mouse.X) - N(base.X);
        const dy = N(mouse.Y) - N(base.Y);
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 1)
            return Vector2.new(dx / length, dy / length);
    } catch (_) { }
    const dir = safeDirection(player, fallbackX);
    const length = Math.sqrt(fallbackX * fallbackX + fallbackY * fallbackY) || 1;
    return Vector2.new((fallbackX / length) * dir, fallbackY / length);
}

export function FaceAim(player, aim) {
    const dir = N(aim?.X, safeDirection(player)) < 0 ? -1 : 1;
    try { Terraria.SetPlayerDirection(player, dir); } catch (_) { }
    return dir;
}

// Equivalente TLPro do CalamityUtils.CleanHoldStyle do Calamity de PC.
// Mantém exatamente a matemática de pivô/centro usada pelas armas que não
// podem depender do renderer vanilla para posicionar a sprite na mão.
export function CleanHoldStyleTLPro(player, desiredRotation, desiredPosition, spriteSize, rotationOriginFromCenter = null, options = null) {
    if (!player || !desiredPosition || !spriteSize)
        return;

    const opts = options || {};
    const dir = safeDirection(player);
    const gravDir = safeGravDir(player);
    let originX = N(rotationOriginFromCenter?.X);
    let originY = N(rotationOriginFromCenter?.Y);

    // O original espelha o pivô junto com direção e gravidade.
    originX *= dir;
    originY *= gravDir;

    let itemRotation = N(desiredRotation);
    if (opts.flipAngle === true)
        itemRotation *= dir;
    else if (dir < 0)
        itemRotation += Math.PI;

    try { player.itemRotation = itemRotation; } catch (_) { }

    const spriteW = N(spriteSize.X);
    const spriteH = N(spriteSize.Y);

    // Exatamente como no PC: âncora no centro da sprite, depois desloca
    // para o pivô específico da arma.
    const anchorDistance = (spriteW / -2 - 10) * dir;
    const centerAnchor = Vector2.new(Math.cos(itemRotation) * anchorDistance, Math.sin(itemRotation) * anchorDistance);
    const rotatedOrigin = rotateXY(originX, originY, itemRotation);

    let finalX = N(desiredPosition.X) - spriteW * 0.5 + N(centerAnchor.X) - N(rotatedOrigin.X);
    let finalY = N(desiredPosition.Y) - spriteH * 0.5 + N(centerAnchor.Y) - N(rotatedOrigin.Y);

    // O CleanHoldStyle original acompanha os 2 px do walk-frame. Esse acesso
    // é opcional no bridge: se a struct não estiver exposta, só pula o ajuste.
    if (opts.stepDisplace !== false) {
        try {
            const frame = player.bodyFrame;
            const h = N(frame?.Height);
            if (h > 0) {
                const index = Math.floor(N(frame?.Y) / h);
                if ((index > 6 && index < 10) || (index > 13 && index < 17))
                    finalY -= 2;
            }
        } catch (_) { }
    }

    try { player.itemLocation = Vector2.new(finalX + spriteW * 0.5, finalY); } catch (_) { }
}

export function ReedMouth(player) {
    const center = player.MountedCenter;
    const dir = safeDirection(player);
    const gravDir = safeGravDir(player);
    return Vector2.new(N(center.X) + dir * 6, N(center.Y) - gravDir * 5);
}

export function ReedShoulder(player) {
    const center = player.MountedCenter;
    const dir = safeDirection(player);
    return Vector2.new(N(center.X) - dir * 4, N(center.Y));
}

export function SetReedArms(player, frontArm = false) {
    if (!player) return;
    const center = SafePlayerCenter(player);
    const baseAim = AimFromMouse(player, center);
    const dir = FaceAim(player, baseAim);
    const gravDir = safeGravDir(player);
    const mouth = ReedMouth(player);
    const mouthAim = AimFromMouse(player, mouth, N(baseAim.X), N(baseAim.Y));

    const backAngle = Math.atan2(N(baseAim.Y), N(baseAim.X));
    const shoulder = ReedShoulder(player);
    const handTarget = Vector2.new(N(mouth.X) + N(mouthAim.X) * 25, N(mouth.Y) + N(mouthAim.Y) * 25);
    const frontAngle = Math.atan2(N(handTarget.Y) - N(shoulder.Y), N(handTarget.X) - N(shoulder.X));

    try {
        const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
        if (frontArm)
            player.SetCompositeArmFront(true, stretch, frontAngle * gravDir - Math.PI / 2);
        player.SetCompositeArmBack(true, stretch, backAngle * gravDir - Math.PI / 2);
    } catch (_) { }
    return { dir, mouth, mouthAim };
}

// Mantido para itens antigos que ainda usam o helper genérico.
export function ApplyAimedHeldPose(player, aim, options = null) {
    if (!player || !aim)
        return;

    const opts = options || {};
    const x = N(aim.X, 1);
    const y = N(aim.Y, 0);
    const length = Math.sqrt(x * x + y * y) || 1;
    const ax = x / length;
    const ay = y / length;
    const dir = FaceAim(player, Vector2.new(ax, ay));
    const angle = Math.atan2(ay, ax);
    const gravDir = safeGravDir(player);

    try { player.itemRotation = Math.atan2(ay * dir, ax * dir); } catch (_) { }

    try {
        const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
        const armRotation = (angle - Math.PI / 2) * gravDir + (gravDir < 0 ? Math.PI : 0);
        if (opts.back !== false)
            player.SetCompositeArmBack(true, stretch, armRotation + N(opts.backRotationOffset, 0) * dir);
        if (opts.front === true)
            player.SetCompositeArmFront(true, stretch, armRotation + N(opts.frontRotationOffset, 0) * dir);
    } catch (_) { }

    if (opts.itemDistance !== undefined) {
        try {
            const center = player.MountedCenter;
            const vertical = N(opts.verticalOffset, 0) * gravDir;
            player.itemLocation = Vector2.new(
                N(center.X) + ax * N(opts.itemDistance, 0),
                N(center.Y) + ay * N(opts.itemDistance, 0) + vertical
            );
        } catch (_) { }
    }
}
