const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { JWT_SECRET } = require('../middlewares/auth');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    try {
        const normalizedUsername = username.trim().toLowerCase();
        const user = await prisma.users.findUnique({
            where: { username: normalizedUsername }
        });

        if (!user) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user.id },
            select: { id: true, username: true, name: true, role: true, created_at: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            select: { id: true, username: true, name: true, role: true, created_at: true },
            orderBy: { id: 'asc' }
        });
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createUser = async (req, res) => {
    const { username, password, name, role = 'empleado' } = req.body;
    if (!username || !password || !name) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    try {
        const normalizedUsername = username.trim().toLowerCase();
        const existing = await prisma.users.findUnique({
            where: { username: normalizedUsername }
        });
        if (existing) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const createdAt = new Date().toISOString();

        const newUser = await prisma.users.create({
            data: {
                username: normalizedUsername,
                password: hashedPassword,
                name: name.trim(),
                role,
                created_at: createdAt
            }
        });

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role }
        });
    } catch (err) {
        if (err.code === 'P2002' || err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
        res.status(500).json({ error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (userId === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario administrador' });
    }

    try {
        await prisma.users.delete({
            where: { id: userId }
        });
        res.json({ message: 'Usuario eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
