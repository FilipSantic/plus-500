-- phpMyAdmin SQL Dump
-- version 4.7.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Apr 15, 2018 at 04:03 PM
-- Server version: 5.7.19
-- PHP Version: 5.6.31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `baza_podataka`
--

-- --------------------------------------------------------

--
-- Table structure for table `korisnici`
--

DROP TABLE IF EXISTS `korisnici`;
CREATE TABLE IF NOT EXISTS `korisnici` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `korisnik` varchar(255) COLLATE latin2_croatian_ci DEFAULT NULL,
  `password` varchar(255) COLLATE latin2_croatian_ci DEFAULT NULL,
  `grad` varchar(255) COLLATE latin2_croatian_ci DEFAULT NULL,
  `adresa` varchar(255) COLLATE latin2_croatian_ci DEFAULT NULL,
  `kontakt` varchar(255) COLLATE latin2_croatian_ci DEFAULT NULL,
  `kune` int(255) NOT NULL DEFAULT '500',
  `aud` int(255) NOT NULL DEFAULT '0',
  `cad` int(255) NOT NULL DEFAULT '0',
  `czk` int(255) NOT NULL DEFAULT '0',
  `dkk` int(255) NOT NULL DEFAULT '0',
  `huf` int(255) NOT NULL DEFAULT '0',
  `jpy` int(255) NOT NULL DEFAULT '0',
  `nok` int(255) NOT NULL DEFAULT '0',
  `sek` int(255) NOT NULL DEFAULT '0',
  `chf` int(255) NOT NULL DEFAULT '0',
  `gbp` int(255) NOT NULL DEFAULT '0',
  `usd` int(255) NOT NULL DEFAULT '0',
  `bam` int(255) NOT NULL DEFAULT '0',
  `eur` int(255) NOT NULL DEFAULT '0',
  `pln` int(255) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin2 COLLATE=latin2_croatian_ci;

--
-- Dumping data for table `korisnici`
--

INSERT INTO `korisnici` (`id`, `korisnik`, `password`, `grad`, `adresa`, `kontakt`, `kune`, `aud`, `cad`, `czk`, `dkk`, `huf`, `jpy`, `nok`, `sek`, `chf`, `gbp`, `usd`, `bam`, `eur`, `pln`) VALUES
(1, 'Filip', '$2a$10$NPgXlf21..hjw9MDNBGFfOSNyHggi.XfcT6rfoeCY2yZCMxyww9Ui', 'Split', 'Pojišanska 36', '0919012370', 300, 21, 0, 0, 43, 0, 0, 9, 0, 0, 0, 0, 0, 7, 0);

-- --------------------------------------------------------

--
-- Table structure for table `transakcije`
--

DROP TABLE IF EXISTS `transakcije`;
CREATE TABLE IF NOT EXISTS `transakcije` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `korisnik` varchar(255) DEFAULT NULL,
  `iz` varchar(255) DEFAULT NULL,
  `piznos` int(255) DEFAULT NULL,
  `u` varchar(255) DEFAULT NULL,
  `kiznos` int(255) DEFAULT NULL,
  `kiznos2` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `transakcije`
--

INSERT INTO `transakcije` (`id`, `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2`) VALUES
(1, 'Filip', 'fromHRK', 99, 'intoAUD', 400, NULL),
(2, 'Filip', 'fromHRK', 100, 'intoAUD', 300, NULL),
(3, 'Filip', 'fromHRK', 99, 'intoAUD', 400, 21),
(4, 'Filip', 'fromHRK', 50, 'intoNOK', 350, 65),
(5, 'Filip', 'fromNOK', 56, 'intoDKK', 9, 43),
(6, 'Filip', 'fromHRK', 50, 'intoEUR', 300, 7);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
