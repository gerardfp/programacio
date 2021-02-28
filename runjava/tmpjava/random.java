  import java.util.Scanner;

public class Main {
    public static void main(String[] args){
        Scanner scanner = new Scanner(System.in);

        int[] a = new int[4];

        int b = scanner.nextInt();

        for(int i =0; i<b; i++){
          System.out.println(a[i]);        
        }
    }
}
