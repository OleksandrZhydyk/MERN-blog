import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserDTO } from "../DTOs/index.js";
// import { UserRepo } from "../repositories/mongoDB/index.js";
import { UserRepo } from "../repositories/dynamoDB/index.js";

export const register = async (req, res) => {
  try {
    const userDTO = new UserDTO.RegisterUserDTO(req.body);

    const user = await UserRepo.registerDB(userDTO);

    const accessToken = jwt.sign(
      { _id: user.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { _id: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
    );

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "None",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      user,
      accessToken,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Register failed",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const dto = new UserDTO.GetMeDTO(req);
    const user = await UserRepo.getMeDB(dto);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      user,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const dto = new UserDTO.LoginUserDTO(req.body);
    const user = await UserRepo.loginDB(dto);

    if (!user) {
      return res.status(401).json({
        message: "User unauthorized",
      });
    }

    const isValidPass = await bcrypt.compare(
      req.body.password,
      user.passwordHash
    );

    if (!isValidPass) {
      return res.status(400).json({
        message: "Incorrect user or password",
      });
    }

    const accessToken = jwt.sign(
      { _id: user.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { _id: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
    );

    const { passwordHash, ...userData } = user;

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "None",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      userData,
      accessToken,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Login failed",
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
      return res.sendStatus(401);
    }

    const refToken = cookies.jwt;

    const decoded = jwt.verify(refToken, process.env.REFRESH_TOKEN_SECRET);

    const dto = new UserDTO.GetMeDTO({ userId: decoded._id });

    const user = await UserRepo.getMeDB(dto);

    if (!user) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const accessToken = jwt.sign(
      { _id: user.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
    );

    res.json({
      accessToken,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "",
    });
  }
};

export const logout = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.sendStatus(204);
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "None",
    secure: process.env.NODE_ENV !== "development",
  });

  console.log("deleted");
  res.sendStatus(204);
};
