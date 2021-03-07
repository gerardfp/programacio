import java.util.Scanner;
        
public class Main {        

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.println("yeaa");

        int[] c= new int[5];

        String line = scanner.nextLine().toLowerCase();
        for(int i=0; i<line.length(); i++){
            if(line.charAt(i) == 'a') c[0]++;
            if(line.charAt(i) == 'e') c[1]++;
            if(line.charAt(i) == 'i') c[2]++;
            if(line.charAt(i) == 'o') c[3]++;
            if(line.charAt(i) == 'u') c[4]++;
        }

        for(int i=0; i<5; i++){
            System.out.println(c[i]);
        }
    }
}