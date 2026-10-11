const prisma = require('../prismaClient');

exports.getCurrentShift = async (req, res) => {
    try {
        const shift = await prisma.shifts.findFirst({
            where: { status: 'active' },
            orderBy: { startTime: 'desc' }
        });

        if (shift) {
            const shiftDate = new Date(shift.startTime).toDateString();
            const currentDate = new Date().toDateString();
            if (shiftDate !== currentDate) {
                // Auto-close if the shift is from a previous day
                const endTime = new Date().toISOString();
                await prisma.shifts.update({
                    where: { id: shift.id },
                    data: { status: 'closed', endTime }
                });
                return res.json({ data: null });
            }
        }

        res.json({ data: shift || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.startShift = async (req, res) => {
    const { initialCash = 0 } = req.body || {};

    try {
        const activeShift = await prisma.shifts.findFirst({
            where: { status: 'active' },
            select: { id: true }
        });

        if (activeShift) {
            return res.status(400).json({ error: 'Ya hay un turno activo.' });
        }

        const startTime = new Date().toISOString();
        const newShift = await prisma.shifts.create({
            data: {
                startTime,
                status: 'active',
                initialCash: Number(initialCash) || 0
            }
        });

        res.status(201).json({ data: newShift });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.endShift = async (req, res) => {
    const shiftId = parseInt(req.params.id, 10);
    const endTime = new Date().toISOString();

    try {
        const existing = await prisma.shifts.findUnique({
            where: { id: shiftId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Turno no encontrado.' });
        }

        await prisma.shifts.update({
            where: { id: shiftId },
            data: { status: 'closed', endTime }
        });

        res.json({ message: 'Turno cerrado exitosamente.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
