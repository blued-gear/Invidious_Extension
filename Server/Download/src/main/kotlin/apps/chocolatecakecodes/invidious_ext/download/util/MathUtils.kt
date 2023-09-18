package apps.chocolatecakecodes.invidious_ext.download.util

object MathUtils {

    fun roundToDecimal(num: Double, decimals: Int): Double {
        val scale = Math.pow(10.0, decimals.toDouble())
        return Math.round(num * scale) / scale
    }
}
